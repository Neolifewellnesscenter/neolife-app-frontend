import React, { createContext, useContext, useState } from "react";

type WishlistItem = {
  id: number;
  name: string;
  price: string;
  qty: string;
  image: any;
};

type WishlistContextType = {
  wishlistItems: WishlistItem[];
  toggleWishlist: (product: WishlistItem) => void;
  isWishlisted: (id: number) => boolean;
  removeFromWishlist: (id: number) => void;
};

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);

  const toggleWishlist = (product: WishlistItem) => {
    setWishlistItems((prev) => {
      const exists = prev.find((item) => item.id === product.id);

      if (exists) {
        return prev.filter((item) => item.id !== product.id);
      }

      return [...prev, product];
    });
  };

  const isWishlisted = (id: number) => {
    return wishlistItems.some((item) => item.id === id);
  };

  const removeFromWishlist = (id: number) => {
    setWishlistItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        toggleWishlist,
        isWishlisted,
        removeFromWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error("useWishlist must be used inside WishlistProvider");
  }

  return context;
}