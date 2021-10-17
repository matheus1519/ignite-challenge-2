import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    let newCart = [];

    try {
      const { data: stock } = await api.get(`/stock/${productId}`);

      const existsProductInCart = cart.find(
        (productInCart) => productInCart.id === productId
      );

      const predictedAmount = existsProductInCart
        ? existsProductInCart.amount + 1
        : 1;

      if (predictedAmount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");

        return;
      }

      if (existsProductInCart) {
        newCart = cart.map((productInCart) =>
          productInCart.id === productId
            ? { ...productInCart, amount: predictedAmount }
            : productInCart
        );
      } else {
        const { data: productFromApi } = await api.get<Product>(
          `products/${productId}`
        );

        newCart = [...cart, { ...productFromApi, amount: predictedAmount }];
      }

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    let newCart = [];

    try {
      const productExists = cart.find(
        (productInCart) => productInCart.id === productId
      );

      if (!productExists) {
        throw new Error("Produto não existe");
      }

      newCart = cart.filter((productInCart) => productInCart.id !== productId);

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    let newCart = [] as Product[];

    try {
      if (amount <= 0) {
        return;
      }

      const { data: stock } = await api.get(`/stock/${productId}`);

      if (amount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");

        return;
      }

      newCart = cart.map((productInCart) =>
        productInCart.id === productId
          ? { ...productInCart, amount }
          : productInCart
      );

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }

  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
