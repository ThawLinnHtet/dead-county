import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent } from 'react';
import type { GameCoordinator } from './gameCoordinator';
import { itemDefinitions } from './items';
import type { ItemInstance } from './items';
import './inventoryPanel.css';

type Selection = { source: 'loot' | 'inventory'; id: string };
const noItems: readonly ItemInstance[] = [];
const containerNames: Record<string, string> = { cabinet: 'Cabinet', drawer: 'Drawer', supply_box: 'Supply Box' };

function ItemIcon({ item }: { item: ItemInstance }) {
  return <img className="item-icon" src={`/assets/items/${item.kind}.png`} alt="" draggable={false} />;
}

export function InventoryPanel({ coordinator }: { coordinator: GameCoordinator }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [received, setReceived] = useState<{ slot: number; itemId: string } | null>(null);
  const [message, setMessage] = useState('');
  const container = coordinator.getOpenContainer();
  const items = useSyncExternalStore(coordinator.subscribe, () =>
    (container && coordinator.getState().containers[container.name]) || noItems);
  const inventory = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().survivor.inventory);
  const equippedId = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().survivor.equippedWeaponId);
  const swinging = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().survivor.attack !== null);
  const slot = selection?.source === 'inventory' ? inventory.findIndex((item) => item?.id === selection.id) : -1;
  const selected = selection?.source === 'loot' ? items.find((item) => item.id === selection.id) : inventory[slot];
  const definition = selected && itemDefinitions[selected.kind];
  const full = !inventory.includes(null);

  useLayoutEffect(() => {
    const panel = dialog.current;
    if (!panel) return;
    panel.showModal();
    close.current?.focus();
    return () => panel.close();
  }, []);

  function select(source: Selection['source'], id: string) {
    setSelection({ source, id });
    setMessage('');
  }

  function transfer() {
    if (!container || selection?.source !== 'loot') return;
    const result = coordinator.transferItem(container.name, selection.id);
    if (result.status !== 'transferred') {
      setMessage(result.status === 'inventory_full' ? 'Inventory full' : 'Item unavailable');
      return;
    }
    setReceived({ slot: result.slot, itemId: selection.id });
    const next = coordinator.getState().containers[container.name]?.[0];
    setSelection(next ? { source: 'loot', id: next.id } : null);
    if (!next || !coordinator.getState().survivor.inventory.includes(null)) close.current?.focus();
  }

  function drop() {
    if (selection?.source !== 'inventory') return;
    const result = coordinator.dropItem(slot, selection.id);
    if (result.status === 'dropped') {
      setSelection(null);
      setMessage('');
      close.current?.focus();
    } else if (result.status === 'cannot_drop') {
      setMessage('Cannot drop item here.');
    } else if (result.status === 'swing_in_progress') {
      setMessage('Finish your swing first.');
    } else {
      setMessage('Item unavailable');
    }
  }

  function keepFocusInside(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    const first = buttons[0];
    const last = buttons.at(-1);
    if (document.activeElement === (event.shiftKey ? first : last)) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    }
  }

  const equipLocked = swinging && selected?.kind === 'baseball_bat';
  const dropLocked = swinging && selected?.id === equippedId;
  const title = container ? containerNames[container.type] ?? 'Container' : 'Inventory';
  const actionReason = selected?.kind === 'water_bottle' ? 'Thirst is already at zero.'
    : selected?.kind === 'canned_food' ? 'Hunger is already at zero.' : 'Health is full.';

  return (
    <dialog
      ref={dialog}
      aria-label={container ? `Loot ${title}` : title}
      className={`inventory-dialog${container ? ' inventory-dialog--loot' : ''}`}
      onCancel={(event) => event.preventDefault()}
      onKeyDown={keepFocusInside}
    >
      <div className="inventory-shell">
        <button ref={close} className="inventory-close" type="button" aria-label="Close" onClick={coordinator.closeInventoryPanel}>×</button>
        {container && (
          <>
            <section className="inventory-panel loot-source" aria-label="Container contents">
              <h2>{title}</h2>
              {items.length === 0 ? <p className="inventory-muted">Nothing left to search</p> : (
                <div className="inventory-slots loot-slots">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      className="inventory-slot"
                      type="button"
                      aria-label={itemDefinitions[item.kind].name}
                      aria-pressed={selection?.source === 'loot' && selection.id === item.id}
                      onClick={() => select('loot', item.id)}
                    >
                      <ItemIcon item={item} />
                    </button>
                  ))}
                </div>
              )}
            </section>
            <div className="loot-transfer">
              <button
                className="inventory-action"
                type="button"
                disabled={selection?.source !== 'loot' || !selected || full}
                onClick={transfer}
              >
                <span aria-hidden="true">→</span> Transfer
              </button>
              <p className="inventory-feedback" role="status">{full && items.length ? 'Inventory full' : selection?.source === 'loot' ? message : ''}</p>
            </div>
          </>
        )}
        <section className="inventory-panel" aria-label="Inventory slots">
          <h2>Inventory</h2>
          <div className="inventory-slots">
            {inventory.map((item, index) => (
              <button
                key={index}
                className="inventory-slot"
                type="button"
                disabled={!item}
                aria-pressed={!!item && selection?.source === 'inventory' && selection.id === item.id}
                aria-label={item
                  ? `Slot ${index + 1}, ${itemDefinitions[item.kind].name}${item.id === equippedId ? ', equipped' : ''}`
                  : `Slot ${index + 1}, empty`}
                onClick={() => { if (item) select('inventory', item.id); }}
              >
                {item && <ItemIcon item={item} />}
                {item && item.id === equippedId && <span className="equipment-mark" aria-hidden="true">✓</span>}
                {item && index === received?.slot && item.id === received.itemId && (
                  <span className="received-item" onAnimationEnd={() => setReceived(null)} />
                )}
              </button>
            ))}
          </div>
        </section>
        <section className="inventory-panel item-details" aria-label="Item details">
          {selected && definition ? (
            <>
              <div className="item-detail-heading">
                <ItemIcon item={selected} />
                <div><h2>{definition.name}</h2><p>{definition.category}</p></div>
              </div>
              <p>{definition.description}</p>
              {selection?.source === 'inventory' && (
                <>
                  <div className="inventory-actions">
                    {selected.kind === 'baseball_bat' ? (
                      <button
                        className="inventory-action"
                        type="button"
                        disabled={equipLocked}
                        aria-describedby={equipLocked ? 'inventory-swing-reason' : undefined}
                        onClick={() => coordinator.toggleEquip(slot, selected.id)}
                      >
                        {selected.id === equippedId ? 'Unequip' : 'Equip'}
                      </button>
                    ) : (
                      <button className="inventory-action" type="button" disabled aria-describedby="inventory-use-reason">Use</button>
                    )}
                    <button
                      className="inventory-action inventory-action--drop"
                      type="button"
                      disabled={dropLocked}
                      aria-describedby={dropLocked ? 'inventory-swing-reason' : undefined}
                      onClick={drop}
                    >
                      Drop
                    </button>
                  </div>
                  {selected.kind !== 'baseball_bat' && (
                    <p id="inventory-use-reason" className="inventory-muted">{actionReason}</p>
                  )}
                  {equipLocked && (
                    <p id="inventory-swing-reason" className="inventory-muted">Finish your swing first.</p>
                  )}
                  <p className="inventory-drop-feedback" role="status">{message}</p>
                </>
              )}
            </>
          ) : (
            <><h2>Item Details</h2><p className="inventory-muted">Select an item to view its details.</p></>
          )}
        </section>
      </div>
    </dialog>
  );
}
