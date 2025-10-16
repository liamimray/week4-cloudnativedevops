import {
  CosmosClient,
  Container,
  CosmosClientOptions,
  Resource,
} from '@azure/cosmos';
import { Product } from '../domain/product';
import { ProductRepo } from '../domain/product-repo';

/**
 * Options for CosmosProductRepo. Do not hard-code config; pass an options object.
 * `key` is optional to support access-key auth; an existing `client` can be injected
 * for testing or alternate auth flows.
 */
export type CosmosProductRepoOptions = {
  endpoint?: string;
  key?: string;
  databaseId: string;
  containerId: string;
  /**
   * Optional pre-built CosmosClient. If provided, endpoint/key are ignored.
   */
  client?: CosmosClient;
  /**
   * Optional Cosmos client options to pass when constructing a new client.
   */
  clientOptions?: CosmosClientOptions;
};

/**
 * Internal DTO representing the shape stored in Cosmos container.
 * This is intentionally separate from the domain Product type.
 */
type ProductDTO = {
  id: string;
  name: string;
  pricePence: number;
  description: string;
  updatedAt: string; // ISO string in storage
  // keep metadata if you want (etag, _ts, etc.)
  _etag?: string;
  _ts?: number;
};

/**
 * Infrastructure implementation of ProductRepo using Azure Cosmos DB (NoSQL).
 * This class is not part of the pure domain; it maps between domain and DTO.
 */
export class CosmosProductRepo implements ProductRepo {
  private container: Container;

  constructor(private opts: CosmosProductRepoOptions) {
    const client =
      opts.client ??
      new CosmosClient({
        endpoint: opts.endpoint,
        key: opts.key,
        ...opts.clientOptions,
      });

    this.container = client
      .database(opts.databaseId)
      .container(opts.containerId);
  }

  private toDTO(product: Product): ProductDTO {
    return {
      id: product.id,
      name: product.name,
      pricePence: product.pricePence,
      description: product.description,
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  private toDomain(dto: ProductDTO): Product {
    return {
      id: dto.id,
      name: dto.name,
      pricePence: dto.pricePence,
      description: dto.description,
      updatedAt: new Date(dto.updatedAt),
    };
  }

  public async getById(id: string): Promise<Product | null> {
    try {
      const item = this.container.item(id);
      const { resource } = await item.read<ProductDTO>();
      if (!resource) return null;
      return this.toDomain(resource);
    } catch (err: any) {
      // Cosmos SDK throws when not found; return null for 404-like cases.
      if (err?.code === 404 || err?.statusCode === 404) return null;
      throw err;
    }
  }

  public async list(): Promise<Product[]> {
    // readAll is simple and returns everything; implementations may add pagination later.
    const { resources } = await this.container.items
      .readAll<ProductDTO>()
      .fetchAll();
    return resources.map((r) => this.toDomain(r));
  }

  public async save(product: Product): Promise<Product> {
    const dto = this.toDTO(product);
    // use upsert so caller can create or update with same method
    const { resource } = await this.container.items.upsert<ProductDTO>(dto);
    // resource should be present; map back to domain
    if (!resource) {
      // defensive: if cosmos didn't return resource, return the original domain product
      return product;
    }
    return this.toDomain(resource);
  }

  public async delete(id: string): Promise<void> {
    try {
      await this.container.item(id).delete();
    } catch (err: any) {
      // ignore not found
      if (err?.code === 404 || err?.statusCode === 404) return;
      throw err;
    }
  }
}
