import { stopwordsEn, stopwordsFr } from "./stopwords";

const stopwords = [...stopwordsEn, ...stopwordsFr];

/**
 * Remove emojis, urls, hashtags, french elisions, punctuation, accents, numbers, and stopwords from a text.
 * Also lowercase the text and remove new lines, tabs and multiple spaces.
 * @param text The text to clean
 * @returns The cleaned text
 */
export const cleanText = (text: string) => {
  // remove emojis
  text = text.replace(
    /[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}]/gu,
    ""
  );

  // format text
  text = text.toLowerCase();
  text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // remove brackets and parenthesis
  text = text.replace(/[\[\]{}()]/g, " ");

  // remove urls
  text = text.replace(/(https?:\/\/[^\s]+)/g, "");

  // remove hashtags
  text = text.replace(/\#\w\w+\s?/g, "");

  // remove french elisions
  text = text.replace(/\b[cdlnmtsj]'|\bqu'/g, "");

  // remove punctuation
  text = text.replace(/[.?|",\/#!$%\^&\*;:{}=_–`~()…“’@]/g, "");
  text = text.replace(/(\s\-)|(\-\s)/g, " ");

  // remove numbers that are not inside words
  text = text.replace(/\b\d+\b/g, "");

  // remove new lines, tabs and multiple spaces
  text = text.replace(/\s\s+/g, " ");

  // remove stopwords
  text = text
    .split(" ")
    .filter((word) => !stopwords.includes(word))
    .join(" ");

  return text.trim();
};
