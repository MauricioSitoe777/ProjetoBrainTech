export type VehicleCategory = 'suv' | 'pickup' | 'sedan' | 'hatchback' | 'van';
export type VehicleMode = 'aluguer' | 'compra';

export interface Vehicle {
  id: number;
  name: string;
  cat: VehicleCategory;
  mode: VehicleMode;
  price: string;
  img: string;
  fuel: string;
  seats: number;
  year: number;
}
