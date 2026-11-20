import { useSyncExternalStore } from 'react';
import type { GameCoordinator } from './gameCoordinator';
import { ItemIcon } from './ItemIcon';
import { itemDefinitions } from './items';
import './inventoryPreview.css';

const previewSlotCount = 10;

export function InventoryPreview({ coordinator }: { coordinator: GameCoordinator }) {
  const inventory = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().survivor.inventory);
  const equippedId = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().survivor.equippedWeaponId);

  return (
    <section className="inventory-preview" aria-label="Inventory preview">
      <p className="inventory-preview__weapon" role="status" data-equipped={equippedId !== null}>
        {equippedId ? 'Equipped Baseball Bat' : 'Unarmed'}
      </p>
      <ul className="inventory-preview__slots" aria-label="First ten inventory slots">
        {inventory.slice(0, previewSlotCount).map((item, slot) => {
          const equipped = item !== null && item.id === equippedId;
          const label = item ? itemDefinitions[item.kind].name : 'Empty';
          return (
            <li key={slot} data-equipped={equipped} aria-label={equipped ? label + ', equipped' : label}>
              {item && <ItemIcon kind={item.kind} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
