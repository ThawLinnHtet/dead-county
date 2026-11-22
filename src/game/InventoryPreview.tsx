import { useSyncExternalStore } from 'react';
import { isMeleeWeapon } from './combat';
import type { GameAudio } from './gameAudio';
import type { GameCoordinator } from './gameCoordinator';
import { ItemIcon } from './ItemIcon';
import { inventoryQuickSlotCount, itemDefinitions } from './items';
import './inventoryPreview.css';

export function InventoryPreview({ coordinator, audio, onOpenInventory, onReturnToWorld }: {
  coordinator: GameCoordinator;
  audio: GameAudio;
  onOpenInventory: (itemId?: string) => void;
  onReturnToWorld: () => void;
}) {
  const inventory = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().survivor.inventory);
  const equippedId = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().survivor.equippedWeaponId);
  const swinging = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().survivor.attack !== null);

  const weapon = inventory.find((item) => item?.id === equippedId);

  return (
    <section className="inventory-preview field-frame" aria-label="Quick inventory">
      <div className="inventory-preview__header">
        <p className="inventory-preview__weapon" role="status" data-equipped={equippedId !== null}>
          {weapon ? 'Equipped ' + itemDefinitions[weapon.kind].name : 'Unarmed'}
        </p>
        <button className="inventory-preview__shortcut" type="button" aria-haspopup="dialog"
          aria-keyshortcuts="I" onClick={() => onOpenInventory()}>
          <kbd aria-hidden="true">I</kbd> Inventory
        </button>
      </div>
      <ul className="inventory-preview__slots" aria-label="First ten inventory slots">
        {inventory.slice(0, inventoryQuickSlotCount).map((item, slot) => {
          if (!item) return <li key={slot} aria-label="Empty" />;
          const name = itemDefinitions[item.kind].name;
          const melee = isMeleeWeapon(item.kind);
          const equipped = item.id === equippedId;
          const locked = melee && swinging;
          const label = melee ? (equipped ? `${name}, equipped` : `Equip ${name}`) : `Open ${name} details`;
          return (
            <li key={slot} data-equipped={equipped}>
              <button
                type="button"
                aria-label={label}
                aria-disabled={locked}
                title={locked ? 'Finish your swing first.' : label}
                onClick={(event) => {
                  const action = coordinator.activateQuickSlot(slot, item.id);
                  if (action === 'equipped' && !equipped) audio.confirm('equip');
                  if (action === 'inspect') onOpenInventory(item.id);
                  else if (event.detail > 0) onReturnToWorld();
                }}
              >
                <ItemIcon kind={item.kind} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
