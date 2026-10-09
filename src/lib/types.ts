export type MenuItemDTO = {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  imageData: string | null;
  emoji: string;
  available: boolean;
};
