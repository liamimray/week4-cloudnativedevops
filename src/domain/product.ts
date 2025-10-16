export type ProductProps = {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type Product = Readonly<{
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}>;

export type CreateProductResult =
  | { success: true; product: Product }
  | { success: false; errors: string[] };

/* Validators (pure) */
const isNonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0;

const isNonNegativeNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0;

const toDateOrUndefined = (v: unknown): Date | undefined =>
  v instanceof Date && !Number.isNaN(v.getTime()) ? v : undefined;

/* Factory (pure) */
export const createProduct = (props: ProductProps): CreateProductResult => {
  const errors: string[] = [];

  if (!isNonEmptyString(props.id)) {
    errors.push('id is required and must be a non-empty string');
  }

  if (!isNonEmptyString(props.name)) {
    errors.push('name is required and must be a non-empty string');
  }

  if (!isNonNegativeNumber(props.price)) {
    errors.push('price is required and must be a non-negative number');
  }

  if (
    props.description !== undefined &&
    typeof props.description !== 'string'
  ) {
    errors.push('description, if provided, must be a string');
  }

  if (props.category !== undefined && typeof props.category !== 'string') {
    errors.push('category, if provided, must be a string');
  }

  const createdAt = toDateOrUndefined(props.createdAt) ?? new Date();
  const updatedAt = toDateOrUndefined(props.updatedAt) ?? createdAt;

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const product: Product = Object.freeze({
    id: props.id,
    name: props.name,
    price: props.price,
    description: props.description,
    category: props.category,
    createdAt,
    updatedAt,
  });

  return { success: true, product };
};
