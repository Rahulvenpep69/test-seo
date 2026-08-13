import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getStripeClient, getStripeConfig } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(req: Request) {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature') as string;

    if (!signature) {
        return new NextResponse('No signature', { status: 400 });
    }

    try {
        const config = await getStripeConfig();
        const stripe = await getStripeClient();

        const event = stripe.webhooks.constructEvent(
            body,
            signature,
            config.webhookSecret!
        );

        const session = event.data.object as any;

        try {
            if (event.type === 'checkout.session.completed') {
                const subscription = await stripe.subscriptions.retrieve(session.subscription);
                const userId = session.metadata.userId;

                if (!userId) {
                    return new NextResponse('User ID not found in metadata', { status: 400 });
                }

                await prisma.subscription.upsert({
                    where: { userId },
                    create: {
                        userId,
                        stripeSubscriptionId: subscription.id,
                        stripeCustomerId: subscription.customer as string,
                        stripePriceId: subscription.items.data[0].price.id,
                        status: 'ACTIVE',
                        plan: session.metadata.planId || 'PRO',
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                    },
                    update: {
                        stripeSubscriptionId: subscription.id,
                        stripeCustomerId: subscription.customer as string,
                        stripePriceId: subscription.items.data[0].price.id,
                        status: 'ACTIVE',
                        plan: session.metadata.planId || 'PRO',
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                    },
                });

                // Also update user status if needed
                await prisma.user.update({
                    where: { id: userId },
                    data: { status: 'ACTIVE' },
                });
            }

            if (event.type === 'invoice.payment_succeeded') {
                const subscription = await stripe.subscriptions.retrieve(session.subscription);

                await prisma.subscription.updateMany({
                    where: { stripeSubscriptionId: subscription.id },
                    data: {
                        status: 'ACTIVE',
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                    },
                });
            }

            if (event.type === 'customer.subscription.updated') {
                const subscription = event.data.object as Stripe.Subscription;

                await prisma.subscription.updateMany({
                    where: { stripeSubscriptionId: subscription.id },
                    data: {
                        status: subscription.status === 'active' ? 'ACTIVE' : 'PAST_DUE',
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                        cancelAtPeriodEnd: subscription.cancel_at_period_end,
                    },
                });
            }

            if (event.type === 'customer.subscription.deleted') {
                const subscription = event.data.object as Stripe.Subscription;

                await prisma.subscription.updateMany({
                    where: { stripeSubscriptionId: subscription.id },
                    data: {
                        status: 'CANCELED',
                        plan: 'FREE',
                    },
                });
            }

            return new NextResponse(null, { status: 200 });
        } catch (error: any) {
            console.error('Webhook database update error:', error);
            return new NextResponse(`Database error: ${error.message}`, { status: 500 });
        }
    } catch (error: any) {
        console.error('Webhook Construct Event Error:', error);
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
    }
}
