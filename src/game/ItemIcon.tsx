import type { ItemKind } from './items';

export function ItemIcon({ kind }: { kind: ItemKind }) {
  return <img className="item-icon" src={import.meta.env.BASE_URL + `assets/items/${kind}.png`} alt="" draggable={false} />;
}
