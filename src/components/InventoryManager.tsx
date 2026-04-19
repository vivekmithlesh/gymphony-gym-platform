import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Megaphone,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { inventoryCreate } from "@/server/api/inventory/create";
import { inventoryList } from "@/server/api/inventory/list";
import { inventoryUpdate } from "@/server/api/inventory/update";
import type { ProductRow } from "@/types/gym.types";
import { toast } from "sonner";
import { BackButton } from "./BackButton";

const icons = ["🥤", "⚡", "🏋️‍♂️", "🧣", "🍎", "💊", "👕", "🎒"];

export function InventoryManager() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const inventoryQuery = useQuery<ProductRow[]>({
    queryKey: ["inventory-list"],
    queryFn: () => inventoryList(),
  });

  const createProductMutation = useMutation({
    mutationFn: inventoryCreate,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-list"] });
      toast.success("✅ Product added to inventory!");
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: inventoryUpdate,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-list"] });
      toast.info("Visibility updated");
    },
  });

  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    category: "Drink",
    icon: "🥤",
  });

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price) {
      toast.error("Please fill in all fields");
      return;
    }

    createProductMutation.mutate({
      data: {
        name: newProduct.name,
        category: newProduct.category as "Drink" | "Gear" | "PT",
        price: Number(newProduct.price),
        stock: 0,
        icon: newProduct.icon,
      },
    });

    setIsAddModalOpen(false);
    setNewProduct({ name: "", price: "", category: "Drink", icon: "🥤" });
  };

  const toggleAppVisibility = (id: number) => {
    const product = inventoryQuery.data?.find((item) => item.id === id);

    if (!product) {
      return;
    }

    updateProductMutation.mutate({
      data: {
        productId: id,
        showInApp: !product.showInApp,
      },
    });
  };

  const filteredProducts = (inventoryQuery.data ?? []).filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="mb-2">
        <BackButton />
      </div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">
            Inventory <span className="text-gradient-brand">Manager</span>
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your gym store products and streak campaigns.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsCampaignModalOpen(true)}
            variant="outline"
            className="h-12 px-6 rounded-xl border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 font-bold transition-all"
          >
            <Megaphone className="mr-2 h-5 w-5" />
            Launch Campaign
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="h-12 px-6 rounded-xl bg-gradient-brand text-primary-foreground font-bold shadow-glow hover:shadow-primary/40 transition-all"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add New Product
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name or category..."
            className="pl-10 h-12 bg-white/5 border-white/10 rounded-xl focus:ring-primary/20"
          />
        </div>
        <Button variant="outline" className="h-12 rounded-xl border-white/10 bg-white/5 gap-2 px-6">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Product
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Category
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Price
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Stock
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  App Visibility
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {inventoryQuery.isLoading &&
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={`inventory-loading-${index}`} className="border-b border-white/5">
                    <td className="px-6 py-4" colSpan={6}>
                      <div className="h-12 rounded-xl bg-white/5 animate-pulse" />
                    </td>
                  </tr>
                ))}
              {inventoryQuery.isError && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-red-400">
                    Failed to load inventory. Please refresh and try again.
                  </td>
                </tr>
              )}
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-xl">
                        {product.icon}
                      </div>
                      <div className="font-bold text-white">{product.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className="rounded-full border-white/10 bg-white/5 text-xs font-medium px-3"
                    >
                      {product.category}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 font-bold text-primary">₹{product.price}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-medium">{product.stock} units</div>
                      <div
                        className={`text-[10px] font-bold uppercase tracking-tighter ${
                          product.status === "In Stock"
                            ? "text-green-400"
                            : product.status === "Low Stock"
                              ? "text-amber-400"
                              : "text-red-400"
                        }`}
                      >
                        {product.status}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleAppVisibility(product.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border ${
                        product.showInApp
                          ? "border-green-500/20 bg-green-500/10 text-green-400"
                          : "border-white/10 bg-white/5 text-muted-foreground"
                      }`}
                    >
                      {product.showInApp ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                      <span className="text-[10px] font-bold uppercase">
                        {product.showInApp ? "Visible" : "Hidden"}
                      </span>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-white/10"
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-red-400/20 text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isAddModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsAddModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-[2rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-slate-900">
                    <Package className="h-6 w-6 text-primary" />
                    <h3 className="text-2xl font-bold">New Product</h3>
                  </div>
                  <button
                    onClick={() => setIsAddModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium">Product Name</Label>
                    <Input
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      placeholder="e.g. BCAA Energy Drink"
                      className="bg-slate-50 border-slate-200 text-slate-900 h-12 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Price (₹)</Label>
                      <Input
                        type="number"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                        placeholder="199"
                        className="bg-slate-50 border-slate-200 text-slate-900 h-12 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Category</Label>
                      <Select
                        value={newProduct.category}
                        onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}
                      >
                        <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 h-12 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Drink">Drink</SelectItem>
                          <SelectItem value="Gear">Gear</SelectItem>
                          <SelectItem value="PT">Personal Training</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium">Icon Picker</Label>
                    <div className="grid grid-cols-4 gap-3">
                      {icons.map((icon) => (
                        <button
                          key={icon}
                          onClick={() => setNewProduct({ ...newProduct, icon })}
                          className={`h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${
                            newProduct.icon === icon
                              ? "bg-primary/10 border-2 border-primary shadow-sm"
                              : "bg-slate-50 border border-slate-100 hover:border-slate-200"
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setIsAddModalOpen(false)}
                    variant="outline"
                    className="flex-1 h-12 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddProduct}
                    className="flex-1 h-12 rounded-xl bg-primary text-white font-bold shadow-lg hover:shadow-primary/30"
                  >
                    Add to Inventory
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCampaignModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsCampaignModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-slate-900 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-white">
                    <Megaphone className="h-6 w-6 text-primary" />
                    <h3 className="text-2xl font-bold">Launch Campaign</h3>
                  </div>
                  <button
                    onClick={() => setIsCampaignModalOpen(false)}
                    className="text-white/40 hover:text-white"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary mt-1 shrink-0" />
                  <p className="text-sm text-white/80 leading-relaxed">
                    Set up a promotional offer for members with high attendance streaks. This will
                    show up in the Member App Store.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white/60 font-medium">Campaign Name</Label>
                    <Input
                      placeholder="e.g. 5-Day Streak Bonus"
                      className="bg-white/5 border-white/10 text-white h-12 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white/60 font-medium">Discount (%)</Label>
                      <Input
                        type="number"
                        placeholder="20"
                        className="bg-white/5 border-white/10 text-white h-12 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/60 font-medium">Applies to</Label>
                      <Select defaultValue="Drinks">
                        <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                          <SelectItem value="Drinks">All Drinks</SelectItem>
                          <SelectItem value="Gear">All Gear</SelectItem>
                          <SelectItem value="All">Entire Store</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setIsCampaignModalOpen(false);
                    toast.success("🚀 Campaign launched to Member App!");
                  }}
                  className="w-full h-14 rounded-2xl bg-gradient-brand text-white font-bold shadow-glow hover:shadow-primary/40 transition-all mt-4"
                >
                  Blast to Member App
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
