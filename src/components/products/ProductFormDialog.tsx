import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { ImageDropzone } from '@/components/products/ImageDropzone';
import { Modal } from '@/components/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { createProduct, updateProduct, uploadProductImage, removeProductImage } from '@/lib/products';
import { PRODUCT_CATEGORIES, type Product, type ProductFormValues } from '@/types/product';

interface ProductFormDialogProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSaved: (product: Product) => void;
}

const EMPTY_VALUES: ProductFormValues = {
  name: '',
  category: 'Rings',
  description: '',
  price: '',
  material: '',
  gemstone: '',
};

function valuesFromProduct(product: Product | null): ProductFormValues {
  if (!product) return EMPTY_VALUES;
  return {
    name: product.name,
    category: product.category,
    description: product.description,
    price: product.price === null ? '' : String(product.price),
    material: product.material,
    gemstone: product.gemstone,
  };
}

const fieldClass = 'input-base';

export function ProductFormDialog({ open, product, onClose, onSaved }: ProductFormDialogProps) {
  const isEdit = product !== null;
  const { user } = useAuth();
  const { notify } = useToast();
  const [values, setValues] = useState<ProductFormValues>(() => valuesFromProduct(product));
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setValues(valuesFromProduct(product));
      setFiles([]);
      setProgress(null);
      setError(null);
    }
  }

  const update = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const validate = (): string | null => {
    if (!values.name.trim()) return 'Please give your product a name.';
    if (values.price.trim() !== '' && (Number.isNaN(Number(values.price)) || Number(values.price) < 0)) {
      return 'Price must be a positive number.';
    }
    if (!isEdit && files.length === 0) return 'Add at least one jewellery photograph.';
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      if (product) {
        const updated = await updateProduct(product.id, values);
        notify('Product details saved.');
        onSaved(updated);
        onClose();
        return;
      }

      if (!user) throw new Error('Your session has expired. Please sign in again.');

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setProgress(`Uploading ${index + 1} of ${files.length}`);
        const imagePath = await uploadProductImage(user.id, file);
        try {
          const name = files.length > 1 ? `${values.name.trim()} ${index + 1}` : values.name;
          const created = await createProduct({ ...values, name }, imagePath);
          onSaved(created);
        } catch (insertError) {
          await removeProductImage(imagePath).catch(() => undefined);
          throw insertError;
        }
      }

      notify(files.length > 1 ? `${files.length} products added to your collection.` : 'Product added to your collection.');
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      notify('We could not save your product. Please try again.', 'error');
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  return (
    <Modal open={open} onClose={submitting ? () => undefined : onClose} title={isEdit ? 'Edit product' : 'Upload jewellery'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {!isEdit && (
          <div>
            <span className="label-text">Product photographs</span>
            <ImageDropzone files={files} onChange={setFiles} onError={setError} disabled={submitting} />
            <p className="mt-2 text-xs text-slate-500">
              Each photograph becomes its own product. Multiple photographs are numbered automatically.
            </p>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="label-text">Product name</label>
            <input
              id="name"
              className={fieldClass}
              value={values.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Sapphire Halo Ring"
              maxLength={120}
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="category" className="label-text">Category</label>
            <select
              id="category"
              className={fieldClass}
              value={values.category}
              onChange={(e) => update('category', e.target.value as ProductFormValues['category'])}
              disabled={submitting}
            >
              {PRODUCT_CATEGORIES.map((category) => (
                <option key={category} value={category} className="bg-onyx">
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="price" className="label-text">Price (optional)</label>
            <input
              id="price"
              inputMode="decimal"
              className={fieldClass}
              value={values.price}
              onChange={(e) => update('price', e.target.value)}
              placeholder="0.00"
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="material" className="label-text">Material</label>
            <input
              id="material"
              className={fieldClass}
              value={values.material}
              onChange={(e) => update('material', e.target.value)}
              placeholder="e.g. 18k yellow gold"
              maxLength={120}
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="gemstone" className="label-text">Gemstone details</label>
            <input
              id="gemstone"
              className={fieldClass}
              value={values.gemstone}
              onChange={(e) => update('gemstone', e.target.value)}
              placeholder="e.g. 1.2ct blue sapphire"
              maxLength={120}
              disabled={submitting}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="description" className="label-text">Description</label>
            <textarea
              id="description"
              rows={4}
              className={`${fieldClass} resize-none`}
              value={values.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Describe the design, craftsmanship and what makes this piece special."
              maxLength={2000}
              disabled={submitting}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-white/5 pt-6 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? progress ?? 'Saving...' : isEdit ? 'Save changes' : 'Add to collection'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
