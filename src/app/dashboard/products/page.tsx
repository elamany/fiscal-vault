"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Package,Plus, Edit, Trash2, Loader2, AlertCircle,
  Image as ImageIcon, Search,  Filter,
  Eye,  FileText,Archive, RefreshCw,
} from "lucide-react";
import { DescriptionToggle } from "@/components/product-description-view-more-less";
import { useDebounce } from "@/hooks/use-debounce";

type StockFilter = "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
type StatusFilter = "ALL" | "DRAFT" | "ACTIVE" | "ARCHIVED";

type Suggestion = { id: string; name: string };

const filters: { label: string; value: StockFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "In Stock", value: "IN_STOCK" },
  { label: "Low Stock", value: "LOW_STOCK" },
  { label: "Out of Stock", value: "OUT_OF_STOCK" },
];

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const debouncedSearch = useDebounce(search, 300);

  const { data: suggestionsData, isLoading: suggestionsLoading } = useQuery<Suggestion[]>({
    queryKey: ["product-suggestions", debouncedSearch],
    queryFn: async () => {
      const response = await fetch(
        `/api/dashboard/products/suggestions?q=${encodeURIComponent(debouncedSearch)}&limit=5`
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.suggestions || [];
    },
    enabled: debouncedSearch.trim().length > 0,
  });

  const suggestions: Suggestion[] = suggestionsData || [];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    if (!value.trim()) {
      setShowSuggestions(false);
    } else {
      setShowSuggestions(true);
    }
  };

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    setSearch(suggestion.name);
    setAppliedSearch(suggestion.name);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(search);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") {
        handleSearchSubmit(e as unknown as React.FormEvent);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        } else {
          setAppliedSearch(search);
          setShowSuggestions(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["dashboard-products", stockFilter, statusFilter, appliedSearch],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams({
        skip: pageParam.toString(),
        take: "20",
        statusFilter,
        stockFilter,
      });
      if (appliedSearch) params.append("search", appliedSearch);

      const response = await fetch(`/api/dashboard/products?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextSkip,
    initialPageParam: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await fetch(`/api/dashboard/products/${productId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to archive product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-products"] });
      setDeleteId(null);
    },
  });

  const handleDelete = (productId: string) => {
    deleteMutation.mutate(productId);
  };

  const allProducts = data?.pages.flatMap((page) => page.products) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-900">Error loading products</p>
          <p className="text-sm text-red-700 mt-1">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="mt-2 text-gray-600">Manage your product catalog</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait transition-all shadow-sm active:scale-[0.98]"
            title="Refresh products"
          >
            <RefreshCw className={`h-5 w-5 ${isRefetching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            href="/dashboard/products/new"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            statusFilter === "ALL"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
          }`}
        >
          All Products
        </button>
        <button
          onClick={() => setStatusFilter("ACTIVE")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
            statusFilter === "ACTIVE"
              ? "bg-green-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
          }`}
        >
          <Eye className="h-4 w-4" />
          Active
        </button>
        <button
          onClick={() => setStatusFilter("DRAFT")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
            statusFilter === "DRAFT"
              ? "bg-amber-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
          }`}
        >
          <FileText className="h-4 w-4" />
          Draft
        </button>
        <button
          onClick={() => setStatusFilter("ARCHIVED")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
            statusFilter === "ARCHIVED"
              ? "bg-gray-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
          }`}
        >
          <Archive className="h-4 w-4" />
          Archived
        </button>
      </div>

      {/* ✅ 3. ADDED BACK: Stock Filter Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        <Filter className="h-4 w-4 text-gray-400 shrink-0" />
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setStockFilter(filter.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              stockFilter === filter.value
                ? "bg-blue-100 text-blue-700"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <form onSubmit={handleSearchSubmit}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={handleSearchChange}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              autoComplete="off"
            />
            {suggestionsLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400 pointer-events-none" />
            )}
          </form>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Suggestions</p>
              </div>
              <ul className="max-h-64 overflow-y-auto">
                {suggestions.map((suggestion: Suggestion, index) => (
                  <li key={suggestion.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectSuggestion(suggestion);
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                        selectedIndex === index ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <Search className={`h-4 w-4 shrink-0 ${selectedIndex === index ? "text-blue-500" : "text-gray-400"}`} />
                      <span className="truncate">{suggestion.name}</span>
                      {selectedIndex === index && (
                        <span className="ml-auto text-xs text-blue-500 font-medium shrink-0">Enter</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">↑↓</kbd> navigate
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">Enter</kbd> select
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">Esc</kbd> close
                </span>
              </div>
            </div>
          )}

          {/* Show "No suggestions" message */}
          {showSuggestions && !suggestionsLoading && suggestions.length === 0 && debouncedSearch.trim().length > 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-lg p-4 text-center">
              <p className="text-sm text-gray-500">
                No products match &quot;<span className="font-medium text-gray-700">{debouncedSearch}</span>&quot;
              </p>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setAppliedSearch(search);
                  setShowSuggestions(false);
                }}
                className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Search anyway
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Products Table */}
      {allProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
            <Package className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600 mb-6">Try adjusting your filters or add a new product.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 max-w-xs">
                      <div className="flex items-start gap-4">
                        <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                          {product.images.length > 0 ? (
                            <Image
                              src={product.images[0].url}
                              alt={product.name}
                              width={64}
                              height={64}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-gray-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate mb-1">{product.name}</p>
                          {product.description && (
                            <div className="w-full">
                              <DescriptionToggle html={product.description} />
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-semibold text-gray-900">{Number(product.price).toLocaleString("en-ET")} ETB</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          product.stock === 0
                            ? "bg-red-100 text-red-700"
                            : product.stock <= 5
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {product.stock === 0 ? "Out of stock" : product.stock <= 5 ? `Low: ${product.stock}` : `${product.stock} in stock`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.status === "ACTIVE" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          <Eye className="h-3 w-3" />
                          Active
                        </span>
                      )}
                      {product.status === "DRAFT" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                          <FileText className="h-3 w-3" />
                          Draft
                        </span>
                      )}
                      {product.status === "ARCHIVED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                          <Archive className="h-3 w-3" />
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/products/${product.id}/edit`}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        {product.status !== "ARCHIVED" && (
                          <button
                            onClick={() => setDeleteId(product.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Archive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Load More Button */}
          {hasNextPage && (
            <div className="p-4 border-t border-gray-200 text-center bg-gray-50/50">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait transition-all shadow-sm"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading more...
                  </>
                ) : (
                  "Load More Products"
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Archive className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Archive Product</h3>
                <p className="text-sm text-gray-600 mt-1">
                  This product will be hidden from your store but preserved for order history.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Archiving...
                  </>
                ) : (
                  "Archive Product"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}