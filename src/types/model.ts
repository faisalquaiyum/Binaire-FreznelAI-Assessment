export type SortOption = 'name-asc' | 'name-desc' | 'downloads-desc' | 'files-asc' | 'files-desc';

export interface ModelRecord {
  id: string;
  author: string;
  name: string;
  family: string;
  pipelineTag: string;
  architecture: string;
  useCase: string;
  weightFormat: string;
  repoUrl?: string;
  tags: string[];
  downloads: number;
  likes: number;
  safetensorFiles: number | null;
  parameterLabel: string;
  lastModified: string;
  private?: boolean;
}

export interface ModelFilters {
  pipeline: string;
  family: string;
  architecture: string;
  weight: string;
  safetensorMin: number;
  safetensorMax: number;
}

export interface CatalogQuery {
  nameQuery: string;
  familyQuery: string;
  filters: ModelFilters;
  sort: SortOption;
}