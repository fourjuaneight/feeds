import { MangadexChapter, MangadexError, MangadexFeed } from './typings.d';

const endpoint = (mangaID: string) =>
  `https://api.mangadex.org/manga/${mangaID}/feed?limit=100&includes[]=scanlation_group&includes[]=user&order[volume]=desc&order[chapter]=desc&offset=0&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic&translatedLanguage[]=en`;

// Get chapter details from Mangadex ID.
export const getManga = async (mangaID: string): Promise<MangadexChapter[]> => {
  try {
    const request = await fetch(endpoint(mangaID), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const response: MangadexFeed | MangadexError = await request.json();

    if (response.result === 'error') {
      const { errors } = response as MangadexError;
      const err = errors
        .map(({ title, detail }) => `${title} - ${detail}`)
        .join('\n');

      throw new Error(`[getManga]:\n${err}`);
    }

    const { data } = response as MangadexFeed;
    const chapters = data.filter(
      dt => dt.type === 'chapter' && dt.attributes.translatedLanguage === 'en'
    );
    const cleanChapters: MangadexChapter[] = chapters
      .map(({ attributes }) => ({
        title: attributes.title,
        chapter: attributes.chapter,
        url: attributes.externalUrl,
        date: attributes.readableAt,
      }))
      .filter(({ url }) => url);

    return cleanChapters;
  } catch (error) {
    throw new Error(`[getManga]: ${error}`);
  }
};
