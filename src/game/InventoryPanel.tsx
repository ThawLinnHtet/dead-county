import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { DragEvent, KeyboardEvent } from 'react';
import type { GameCoordinator } from './gameCoordinator';
import { ItemIcon } from './ItemIcon';
import { carriedLoad, itemDefinitions } from './items';
import type { ItemInstance } from './items';
import { roundSurvivalStat, survivalStatNames } from './survival';
import './inventoryPanel.css';

type Selection = { source: 'loot' | 'inventory'; id: string };
type InventorySource = { source: 'inventory'; id: string; slot: number };
type DragSource = InventorySource | { source: 'loot'; id: string; containerId: string };
const noItems: readonly ItemInstance[] = [];
const itemDragType = 'application/x-dead-county-item';
const containerNames: Record<string, string> = { cabinet: 'Cabinet', drawer: 'Drawer', supply_box: 'Supply Box' };

export function InventoryPanel({ coordinator, initialItemId }: { coordinator: GameCoordinator; initialItemId?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const dragSource = useRef<DragSource | null>(null);
  const [dragging, setDragging] = useState<DragSource | null>(null);
  const [dropTarget, setDropTarget] = useState<number | 'ground' | null>(null);
  const [moveSource, setMoveSource] = useState<InventorySource | null>(null);
  const [selection, setSelection] = useState<Selection | null>(() =>
    initialItemId ? { source: 'inventory', id: initialItemId } : null);
  const [received, setReceived] = useState<{ slot: number; itemId: string } | null>(null);
  const [message, setMessage] = useState('');
  const container = coordinator.getOpenContainer();
  const items = useSyncExternalStore(coordinator.subscribe, () =>
    (container && coordinator.getState().containers[container.name]) || noItems);
  const inventory = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().survivor.inventory);
  const equippedId = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().survivor.equippedWeaponId);
  const packId = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().survivor.equippedPackId);
  const swinging = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().survivor.attack !== null);
  const slot = selection?.source === 'inventory' ? inventory.findIndex((item) => item?.id === selection.id) : -1;
  const selected = selection?.source === 'loot' ? items.find((item) => item.id === selection.id) : inventory[slot];
  const definition = selected && itemDefinitions[selected.kind];
  const firstEmpty = inventory.indexOf(null);
  const full = firstEmpty === -1;
  const itemUse = selection?.source === 'inventory' && selected && selected.kind !== 'baseball_bat'
    ? coordinator.getItemUse(slot, selected.id) : null;
  const useReason = itemUse?.status === 'no_benefit' ? itemUse.reason : null;
  const packSelected = selected?.kind === 'backpack';
  const { weight, capacity, exertion } = carriedLoad(inventory, packId);
  const shownWeight = Number(weight.toFixed(2));

  useLayoutEffect(() => {
    const panel = dialog.current;
    if (!panel) return;
    panel.showModal();
    const selectedSlot = grid.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    (selectedSlot ?? close.current)?.focus();
    function cancelOnHide() {
      if (!document.hidden) return;
      dragSource.current = null;
      setDragging(null);
      setDropTarget(null);
      setMoveSource(null);
    }
    document.addEventListener('visibilitychange', cancelOnHide);
    return () => {
      document.removeEventListener('visibilitychange', cancelOnHide);
      panel.close();
    };
  }, []);

  function select(source: Selection['source'], id: string) {
    setSelection({ source, id });
    setMessage('');
  }

  function transfer(containerId: string, itemId: string) {
    const result = coordinator.transferItem(containerId, itemId);
    if (result.status !== 'transferred') {
      setMessage(result.status === 'inventory_full' ? 'Inventory full'
        : result.status === 'too_heavy' ? 'Too heavy to carry.' : 'Item unavailable');
      return;
    }
    setMessage('');
    setReceived({ slot: result.slot, itemId });
    const next = coordinator.getState().containers[containerId]?.[0];
    setSelection(next ? { source: 'loot', id: next.id } : null);
    if (!next || !coordinator.getState().survivor.inventory.includes(null)) close.current?.focus();
  }

  function startDrag(event: DragEvent, from: DragSource) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(itemDragType, 'item');
    dragSource.current = from;
    setDragging(from);
    setMoveSource(null);
    select(from.source, from.id);
  }

  function endDrag() {
    dragSource.current = null;
    setDragging(null);
    setDropTarget(null);
  }

  function allowDrop(event: DragEvent, target: number | 'ground' | null) {
    if (!getDragSource(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = target === null ? 'none' : 'move';
    setDropTarget(target);
  }

  function getDragSource(event: DragEvent) {
    return event.dataTransfer.types.includes(itemDragType) ? dragSource.current : null;
  }

  function highlightInventoryTarget(event: DragEvent, index?: number) {
    const from = getDragSource(event);
    if (!from) return;
    event.stopPropagation();
    if (from.source === 'loot') allowDrop(event, full ? null : firstEmpty);
    else allowDrop(event, index === undefined || index === from.slot ? null : index);
  }

  function leaveDropArea(event: DragEvent<HTMLElement>) {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !event.currentTarget.contains(next)) setDropTarget(null);
  }

  function moveItem(from: InventorySource, to: number) {
    if (from.slot === to) return;
    const swaps = coordinator.getState().survivor.inventory[to] !== null;
    if (!coordinator.moveInventoryItem(from.slot, from.id, to)) {
      setMessage('Item unavailable');
      return;
    }
    setSelection({ source: 'inventory', id: from.id });
    setReceived({ slot: to, itemId: from.id });
    setMessage(swaps ? `Swapped with slot ${to + 1}.` : `Moved to slot ${to + 1}.`);
  }

  function dropInInventory(event: DragEvent, to?: number) {
    const from = getDragSource(event);
    if (!from) return;
    event.preventDefault();
    endDrag();
    if (from.source === 'loot') transfer(from.containerId, from.id);
    else if (to !== undefined) moveItem(from, to);
  }

  function pickSlot(index: number, item: ItemInstance | null) {
    if (moveSource) {
      moveItem(moveSource, index);
      setMoveSource(null);
    } else if (item) select('inventory', item.id);
  }

  function toggleMove(from: InventorySource) {
    if (moveSource) {
      setMoveSource(null);
      return;
    }
    setMoveSource(from);
    setMessage('');
    grid.current?.querySelector<HTMLButtonElement>(`[data-inventory-slot="${from.slot}"]`)?.focus();
  }

  function useSelectedItem() {
    if (selection?.source !== 'inventory') return;
    const result = coordinator.useItem(slot, selection.id);
    if (result.status === 'used' || result.status === 'wedged') {
      setSelection(null);
      setMoveSource(null);
      setMessage(result.status === 'wedged' ? 'Door wedged.' : `${survivalStatNames[result.stat]} ${roundSurvivalStat(result.value)} / 100`);
      close.current?.focus();
    } else {
      setMessage(result.status === 'no_benefit' ? result.reason : 'Item unavailable');
    }
  }

  function drop(from: InventorySource) {
    const result = coordinator.dropItem(from.slot, from.id);
    if (result.status === 'dropped') {
      setSelection(null);
      setMoveSource(null);
      setMessage('');
      close.current?.focus();
    } else if (result.status === 'cannot_drop') {
      setMessage('Cannot drop item here.');
    } else if (result.status === 'swing_in_progress') {
      setMessage('Finish your swing first.');
    } else if (result.status === 'too_heavy') {
      setMessage('Lighten your inventory before removing the backpack.');
    } else {
      setMessage('Item unavailable');
    }
  }

  function dropOnGround(event: DragEvent) {
    const from = getDragSource(event);
    if (from?.source !== 'inventory') return;
    event.preventDefault();
    endDrag();
    drop(from);
  }

  function keepFocusInside(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'Escape' && moveSource) {
      event.preventDefault();
      setMoveSource(null);
      return;
    }
    if (event.key !== 'Tab') return;
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled):not([tabindex="-1"])')];
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

  return (
    <dialog
      ref={dialog}
      aria-label={container ? `Loot ${title}` : title}
      className={`inventory-dialog${container ? ' inventory-dialog--loot' : ''}`}
      onCancel={(event) => event.preventDefault()}
      onKeyDown={keepFocusInside}
      onDragEnd={endDrag}
    >
      <div className="inventory-shell">
        <header className="inventory-header">
          <h2>{container ? 'Loot' : 'Inventory'}</h2>
          <button ref={close} className="inventory-close" type="button" aria-label="Close" onClick={coordinator.closeInventoryPanel}>×</button>
        </header>
        {container && (
            <section className="inventory-panel loot-source" aria-label="Container contents">
              <h3>{title}</h3>
              {items.length === 0 ? <p className="inventory-muted">Nothing left to search</p> : (
                <div className="inventory-slots loot-slots">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      className="inventory-slot"
                      type="button"
                      aria-label={itemDefinitions[item.kind].name}
                      aria-pressed={selection?.source === 'loot' && selection.id === item.id}
                      draggable
                      data-dragging={dragging?.source === 'loot' && dragging.id === item.id}
                      onDragStart={(event) => startDrag(event, { source: 'loot', id: item.id, containerId: container.name })}
                      onClick={() => select('loot', item.id)}
                    >
                      <ItemIcon kind={item.kind} />
                    </button>
                  ))}
                </div>
              )}
              {items.length > 0 && (
                <div className="loot-transfer">
                  <button
                    className="inventory-action inventory-action--primary"
                    type="button"
                    disabled={selection?.source !== 'loot' || !selected || full}
                    onClick={() => { if (selection?.source === 'loot') transfer(container.name, selection.id); }}
                  >
                    Transfer
                  </button>
                  <p className="inventory-feedback" role="status">
                    {full ? 'Inventory full' : selection?.source === 'loot' && message ? message : 'Drag to Inventory.'}
                  </p>
                </div>
              )}
            </section>
        )}
        <section className="inventory-panel inventory-storage" aria-label="Inventory slots">
          {container && <h3>Inventory</h3>}
          <p className="inventory-carry" aria-label="Carried weight">
            {shownWeight} / {capacity} kg
            {exertion > 0 && <span title="Sprinting drains Stamina faster and recovery takes longer.">Heavy load</span>}
          </p>
          <div ref={grid} className="inventory-slots" onDragOver={(event) => highlightInventoryTarget(event)}
            onDragLeave={leaveDropArea} onDrop={(event) => dropInInventory(event)}>
            {inventory.map((item, index) => (
              <button
                key={index}
                className="inventory-slot"
                type="button"
                tabIndex={item || moveSource ? 0 : -1}
                aria-disabled={!item && !moveSource}
                aria-pressed={!!item && selection?.source === 'inventory' && selection.id === item.id}
                aria-label={item
                  ? `Slot ${index + 1}, ${itemDefinitions[item.kind].name}${item.id === equippedId || item.id === packId ? ', equipped' : ''}`
                  : `Slot ${index + 1}, empty`}
                draggable={!!item}
                data-inventory-slot={index}
                data-equipped={!!item && (item.id === equippedId || item.id === packId)}
                data-dragging={dragging?.source === 'inventory' && dragging.slot === index}
                data-drop-target={dropTarget === index}
                data-loot-receiver={dragging?.source === 'loot' && firstEmpty === index}
                data-move-target={moveSource !== null && moveSource.slot !== index}
                onDragStart={(event) => { if (item) startDrag(event, { source: 'inventory', id: item.id, slot: index }); }}
                onDragOver={(event) => highlightInventoryTarget(event, index)}
                onDrop={(event) => dropInInventory(event, index)}
                onClick={() => pickSlot(index, item)}
              >
                {item && <ItemIcon kind={item.kind} />}
                {!item && dropTarget === index && dragging && selected?.id === dragging.id && (
                  <span className="inventory-slot-preview"><ItemIcon kind={selected.kind} /></span>
                )}
                {item && (item.id === equippedId || item.id === packId) && <span className="equipment-mark" aria-hidden="true">✓</span>}
                {item && index === received?.slot && item.id === received.itemId && (
                  <span className="received-item" onAnimationEnd={() => setReceived(null)} />
                )}
              </button>
            ))}
          </div>
          <p className="inventory-hint" role="status">
            {moveSource ? 'Choose a destination slot.' : dragging?.source === 'loot' && !full
              ? `Next open slot: ${firstEmpty + 1}` : 'Drag to rearrange.'}
          </p>
        </section>
        <section className="inventory-panel item-details" aria-label="Item details">
          {selected && definition ? (
            <>
              <div className="item-detail-heading">
                <ItemIcon kind={selected.kind} />
                <div><h3>{definition.name}</h3><p>{definition.category} · {definition.weight} kg</p></div>
              </div>
              <p>{definition.description}</p>
              {selection?.source === 'inventory' && (
                <>
                  <div className="inventory-actions">
                    {selected.kind === 'baseball_bat' || packSelected ? (
                      <button
                        className="inventory-action inventory-action--primary"
                        type="button"
                        disabled={equipLocked}
                        aria-describedby={equipLocked ? 'inventory-swing-reason' : undefined}
                        onClick={() => {
                          if (!packSelected) {
                            coordinator.toggleEquip(slot, selected.id);
                            return;
                          }
                          const result = coordinator.togglePack(slot, selected.id);
                          setMessage(result === 'too_heavy' ? 'Lighten your inventory before removing the backpack.' : '');
                        }}
                      >
                        {selected.id === equippedId || selected.id === packId ? 'Unequip' : 'Equip'}
                      </button>
                    ) : (
                      <button
                        className="inventory-action inventory-action--primary"
                        type="button"
                        disabled={itemUse?.status !== 'eligible'}
                        aria-describedby={useReason ? 'inventory-use-reason' : undefined}
                        onClick={useSelectedItem}
                      >
                        Use
                      </button>
                    )}
                    <button
                      className="inventory-action"
                      type="button"
                      aria-pressed={moveSource !== null}
                      onClick={() => toggleMove({ source: 'inventory', slot, id: selected.id })}
                    >
                      {moveSource ? 'Cancel move' : 'Move'}
                    </button>
                    <button
                      className="inventory-action inventory-action--drop"
                      type="button"
                      disabled={dropLocked}
                      aria-describedby={dropLocked ? 'inventory-swing-reason' : undefined}
                      data-drop-target={dropTarget === 'ground'}
                      onDragOver={(event) => {
                        if (dragSource.current?.source === 'inventory' && !dropLocked) allowDrop(event, 'ground');
                      }}
                      onDragLeave={leaveDropArea}
                      onDrop={dropOnGround}
                      onClick={() => drop({ source: 'inventory', slot, id: selected.id })}
                    >
                      Drop
                    </button>
                  </div>
                  {dragging?.source === 'inventory' && !dropLocked && (
                    <p className="inventory-muted">Drop here to place the item nearby.</p>
                  )}
                  {useReason && (
                    <p id="inventory-use-reason" className="inventory-muted">{useReason}</p>
                  )}
                  {equipLocked && (
                    <p id="inventory-swing-reason" className="inventory-muted">Finish your swing first.</p>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <h3>Item Details</h3>
              {!message && <p className="inventory-muted">Select an item to view its details.</p>}
            </>
          )}
          <p className="inventory-item-feedback" role="status">{selection?.source !== 'loot' ? message : ''}</p>
        </section>
      </div>
    </dialog>
  );
}
