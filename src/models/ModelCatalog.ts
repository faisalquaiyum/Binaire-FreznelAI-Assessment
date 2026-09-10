import type { CatalogQuery, ModelRecord } from '../types/model';

export class ModelCatalog {
  constructor(private readonly models: ModelRecord[]) {}

  select(query: CatalogQuery): ModelRecord[] {
    const nameQuery = query.nameQuery.trim().toLowerCase();
    const familyQuery = query.familyQuery.trim().toLowerCase();
    const filtered = this.models.filter((model) => {
      const nameMatch = !nameQuery || `${model.name} ${model.id}`.toLowerCase().includes(nameQuery);
      const familyMatch = !familyQuery || model.family.toLowerCase().includes(familyQuery);
      const pipelineMatch = query.filters.pipeline === 'all' || model.pipelineTag === query.filters.pipeline;
      const familyTagMatch = query.filters.family === 'all' || model.family === query.filters.family;
      const architectureMatch = query.filters.architecture === 'all' || model.architecture === query.filters.architecture;
      const weightMatch = query.filters.weight === 'all' || model.weightFormat === query.filters.weight;
      const fileMatch = model.safetensorFiles === null || (model.safetensorFiles >= query.filters.safetensorMin && model.safetensorFiles <= query.filters.safetensorMax);
      return nameMatch && familyMatch && pipelineMatch && familyTagMatch && architectureMatch && weightMatch && fileMatch;
    });
    return filtered.sort((left, right) => {
      if (query.sort === 'name-asc') return left.name.localeCompare(right.name);
      if (query.sort === 'name-desc') return right.name.localeCompare(left.name);
      if (query.sort === 'files-asc' || query.sort === 'files-desc') {
        if (left.safetensorFiles === null) return 1;
        if (right.safetensorFiles === null) return -1;
        return query.sort === 'files-asc'
          ? left.safetensorFiles - right.safetensorFiles
          : right.safetensorFiles - left.safetensorFiles;
      }
      return right.downloads - left.downloads;
    });
  }
}