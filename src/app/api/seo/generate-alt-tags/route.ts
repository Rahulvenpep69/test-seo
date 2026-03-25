import { NextResponse } from 'next/server';
import { generateAiAltTags } from '@/lib/seo/images';

export async function POST(req: Request) {
    try {
        const { images, pageTitle, pageDescription } = await req.json();

        if (!images || !Array.isArray(images)) {
            return NextResponse.json({ error: 'Images array is required' }, { status: 400 });
        }

        const result = await generateAiAltTags(images, pageTitle || '', pageDescription || '');

        // Map back to images
        const altTags = images.map((img, i) => ({
            image: img.src,
            alt: result.altTags[i] || '',
            source: result.source
        }));

        return NextResponse.json({ altTags });
    } catch (error: any) {
        console.error('Alt tag generation error:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate alt tags' }, { status: 500 });
    }
}
