'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  ArrowLeft, Upload, X, AlertCircle, 
  Plus, ChevronLeft, ChevronRight, Check, Package,
  DollarSign, Boxes, FileImage, Tag, CloudUpload,
  CheckCircle2, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import RichTextEditor from '@/components/rich-text-editor';
import { DescriptionToggle } from '@/components/product-description-view-more-less';
import { sanitizeHtmlClient } from '@/lib/sanitize-client';

interface LocalImage {
  id: string;
  file: File;
  previewUrl: string;
}

type UploadStage = 'idle' | 'uploading' | 'success';

export default function NewProductPage() {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [images, setImages] = useState<LocalImage[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  
  const abortControllerRef = useRef<{ abort: () => void } | null>(null);

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addImages = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`"${file.name}" is too large. Maximum size is 5MB.`);
        return;
      }
    }

    if (images.length + fileArray.length > 10) {
      setError(`You can only add ${10 - images.length} more image(s). Maximum is 10.`);
      return;
    }

    setError('');
    const newImages: LocalImage[] = fileArray.map((file, index) => ({
      id: `local-${Date.now()}-${index}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addImages(e.dataTransfer.files);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const moveImage = (fromIndex: number, direction: 'left' | 'right') => {
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= images.length) return;
    setImages((prev) => {
      const newImages = [...prev];
      [newImages[fromIndex], newImages[toIndex]] = [newImages[toIndex], newImages[fromIndex]];
      return newImages;
    });
  };

  const handleSubmitClick = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Product name is required');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid price');
      return;
    }

    const stockNum = parseInt(stock);
    if (isNaN(stockNum) || stockNum < 0) {
      setError('Please enter a valid stock quantity');
      return;
    }

    if (images.length === 0) {
      setError('Please upload at least one product image');
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmSubmit = () => {
    setShowConfirmModal(false);
    setUploadStage('uploading');
    setUploadProgress(0);
    setUploadStatus('Preparing upload...');
    setError('');

    const formData = new FormData();
    
    formData.append(
      'data',
      JSON.stringify({
        name: name.trim(),
        description: description.trim() ? sanitizeHtmlClient(description) : undefined,
        price: parseFloat(price),
        stock: parseInt(stock),
      })
    );

    images.forEach((img) => {
      formData.append('files', img.file);
    });

    const xhr = new XMLHttpRequest();
    abortControllerRef.current = { abort: () => xhr.abort() };

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 90);
        setUploadProgress(percent);
        
        if (percent < 30) setUploadStatus('Uploading images...');
        else if (percent < 70) setUploadStatus('Uploading product data...');
        else setUploadStatus('Almost there...');
      }
    };

    xhr.onload = () => {
      setUploadProgress(100);
      setUploadStatus('Finalizing...');
      
      setTimeout(() => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadStage('success');
          images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            setError(data.error || 'Failed to create product');
          } catch {
            setError('Failed to create product');
          }
          setUploadStage('idle');
        }
      }, 500);
    };

    xhr.onerror = () => {
      setError('Network error. Please try again.');
      setUploadStage('idle');
    };

    xhr.onabort = () => {
      setUploadStage('idle');
    };

    xhr.open('POST', '/api/dashboard/products');
    xhr.send(formData);
  };

  const cancelSubmit = () => {
    setShowConfirmModal(false);
  };

  const handleAddAnother = () => {
    setName('');
    setDescription('');
    setPrice('');
    setStock('');
    setImages([]);
    setUploadStage('idle');
    setUploadProgress(0);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewProducts = () => {
    router.push('/dashboard/products');
  };

  return (
    <div className="max-w-350 mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard/products"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
        <p className="mt-2 text-gray-600">
          Fill in the details below to add a new product to your store.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-red-900">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmitClick} className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Wireless Bluetooth Headphones"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50 focus:bg-white"
            />
          </div>

          <div>
            <RichTextEditor
              label="Description"
              value={description}
              onChange={setDescription}
              placeholder="Describe your product, its features, and benefits..."
            />
            <p className="mt-2 text-xs text-gray-500">
              Use formatting to make your product description stand out.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="price" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Price (ETB) <span className="text-red-500">*</span>
              </label>
              <input
                id="price"
                type="number"
                required
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="stock" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Stock Quantity <span className="text-red-500">*</span>
              </label>
              <input
                id="stock"
                type="number"
                required
                min="0"
                step="1"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50 focus:bg-white"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-semibold text-gray-900">
              Product Images <span className="text-red-500">*</span>
            </label>
            {images.length > 0 && (
              <span className="text-xs text-gray-500">
                {images.length}/10 images
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-4">
            The first image will be the main product image. You can reorder them below.
          </p>

          {images.length < 10 && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                multiple
                onChange={(e) => {
                  addImages(e.target.files);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, WebP, GIF (max 5MB each)
                  </p>
                </div>
              </label>
            </div>
          )}

          {images.length > 0 && (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map((image, index) => (
                <div
                  key={image.id}
                  className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100"
                >
                  <Image
                    src={image.previewUrl}
                    alt={`Product image ${index + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  
                  {index === 0 && (
                    <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-md shadow-sm">
                      Main
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                    <div className="flex items-center gap-1">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => moveImage(index, 'left')}
                          className="p-1.5 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                          title="Move left"
                        >
                          <ChevronLeft className="h-4 w-4 text-gray-700" />
                        </button>
                      )}
                      {index < images.length - 1 && (
                        <button
                          type="button"
                          onClick={() => moveImage(index, 'right')}
                          className="p-1.5 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                          title="Move right"
                        >
                          <ChevronRight className="h-4 w-4 text-gray-700" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(image.id)}
                        className="p-1.5 bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                        title="Remove image"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                    <span className="text-xs text-white font-medium">
                      Image {index + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/dashboard/products"
            className="px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={uploadStage === 'uploading'}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-wait transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Create Product
          </button>
        </div>
      </form>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 bg-linear-to-r from-blue-50 to-indigo-50 shrink-0">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900">
                    Confirm Product Creation
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Please review the details below before creating your product.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={cancelSubmit}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 overflow-y-auto flex-1">
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-5">
                <div className="flex items-start gap-4">
                  <div className="h-24 w-24 rounded-lg bg-gray-200 shrink-0 overflow-hidden relative">
                    {images.length > 0 ? (
                      <Image
                        src={images[0].previewUrl}
                        alt="Main product image"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <FileImage className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-bold text-gray-900 mb-1 wrap-break-words">
                      {name}
                    </h4>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
                        <DollarSign className="h-3.5 w-3.5" />
                        {parseFloat(price).toLocaleString('en-ET')} ETB
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                        <Boxes className="h-3.5 w-3.5" />
                        {parseInt(stock)} in stock
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Tag className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Product Name</p>
                    <p className="text-sm text-gray-900 mt-0.5 wrap-break-words">{name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                    <FileImage className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</p>
                    <DescriptionToggle html={description} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        {parseFloat(price).toLocaleString('en-ET')} ETB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <Boxes className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        {parseInt(stock)} units
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <FileImage className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Images ({images.length})
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {images.slice(0, 6).map((img, idx) => (
                        <div
                          key={img.id}
                          className="relative h-14 w-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-100"
                        >
                          <Image
                            src={img.previewUrl}
                            alt={`Preview ${idx + 1}`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          {idx === 0 && (
                            <div className="absolute top-0 left-0 bg-blue-600 text-white text-[9px] font-bold px-1 py-0.5 rounded-br">
                              Main
                            </div>
                          )}
                        </div>
                      ))}
                      {images.length > 6 && (
                        <div className="h-14 w-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                          <span className="text-xs font-semibold text-gray-600">
                            +{images.length - 6}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={cancelSubmit}
                className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Go Back & Edit
              </button>
              <button
                type="button"
                onClick={confirmSubmit}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
              >
                <Check className="h-4 w-4" />
                Confirm & Create Product
              </button>
            </div>
          </div>
        </div>
      )}

      {uploadStage === 'uploading' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-8 py-10 text-center">
              <div className="relative mx-auto h-24 w-24 mb-6">
                <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-20"></div>
                <div className="relative h-24 w-24 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-600/30">
                  <CloudUpload className="h-10 w-10 text-white animate-bounce" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">Creating Your Product</h3>
              <p className="text-sm text-gray-600 mb-6">{uploadStatus}</p>

              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs font-semibold text-gray-500 mt-2">{uploadProgress}%</p>
            </div>
          </div>
        </div>
      )}

      {uploadStage === 'success' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-8 py-10 text-center">
              <div className="relative mx-auto h-24 w-24 mb-6">
                <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-30"></div>
                <div className="relative h-24 w-24 rounded-full bg-linear-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-green-600/30 animate-[scaleIn_0.5s_ease-out]">
                  <CheckCircle2 className="h-12 w-12 text-white" />
                </div>
                <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 animate-pulse" />
                <Sparkles className="absolute -bottom-1 -left-2 h-5 w-5 text-yellow-400 animate-pulse" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">Product Created!</h3>
              <p className="text-sm text-gray-600 mb-8">
                Your product <strong className="text-gray-900">&quot;{name}&quot;</strong> has been successfully added to your store.
              </p>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleAddAnother}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                >
                  <Plus className="h-5 w-5" />
                  Add Another Product
                </button>
                <button
                  type="button"
                  onClick={handleViewProducts}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all active:scale-[0.98]"
                >
                  <Package className="h-5 w-5" />
                  View All Products
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}