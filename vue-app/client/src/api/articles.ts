import client from "./client";

export interface Article {
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  tags: string[];
  description: string;
  content?: string;
}

export async function listArticles(): Promise<Article[]> {
  const { data } = await client.get<Article[]>("/articles");
  return data;
}

export async function getArticle(slug: string): Promise<Article> {
  const { data } = await client.get<Article>(`/articles/${slug}`);
  return data;
}

export async function listDrafts(): Promise<Article[]> {
  const { data } = await client.get<Article[]>("/articles/drafts");
  return data;
}

export async function getDraft(slug: string): Promise<Article> {
  const { data } = await client.get<Article>(`/articles/drafts/${slug}`);
  return data;
}

export async function publishDraft(slug: string): Promise<void> {
  await client.patch(`/articles/drafts/${slug}/publish`);
}
