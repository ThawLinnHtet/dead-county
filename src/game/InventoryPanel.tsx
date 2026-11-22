import { useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { DragEvent, KeyboardEvent } from 'react';
import type { GameAudio } from './gameAudio';
import type { GameCoordinator, StorageLocation } from './gameCoordinator';
import { ItemIcon } from './ItemIcon';
import { backpackSlots, carriedLoad, itemDefinitions, itemWeight } from './items';
import type { ItemInstance } from './items';
import { roundSurvivalStat, survivalStatNames } from './survival';
import './inventoryPanel.css';

type Selection = { source: 'loot' | 'inventory' | 'pack'; id: string };
type InventorySource = { source: 'inventory'; id: string; slot: number };
type DragSource = InventorySource | { source: 'loot' | 'pack'; id: string; storageId: string };
type DropTarget = number | 'ground' | 'loot' | 'pack';
type Feedback = { text: string; error?: boolean };
const noItems: readonly ItemInstance[] = [];
const itemDragType = 'application/x-dead-county-item';
const containerNames: Record<string, string> = { cabinet: 'Cabinet', drawer: 'Drawer', supply_box: 'Supply Box' };

export function InventoryPanel({ coordinator, audio, initialItemId }: {
  coordinator: GameCoordinator;
  audio: GameAudio;
  initialItemId?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const transferButton = useRef<HTMLButtonElement>(null);
  const focusAfterChange = useRef<'transfer' | 'item' | null>(null);
  const transferHintId = useId();
  const dragSource = useRef<DragSource | null>(null);
  const [dragging, setDragging] = useState<DragSource | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [moveSource, setMoveSource] = useState<InventorySource | null>(null);
  const [selection, setSelection] = useState<Selection | null>(() =>
    initialItemId ? { source: 'inventory', id: initialItemId } : null);
  const [received, setReceived] = useState<{ slot: number; itemId: string } | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const container = coordinator.getOpenContainer();
  const items = useSyncExternalStore(coordinator.subscribe, () =>
    (container && coordinator.getState().containers[container.name]) || noItems);
  const inventory = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().survivor.inventory);
  const equippedId = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().survivor.equippedWeaponId);
  const packId = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().survivor.equippedPackId);
  const packs = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().packs);
  const packed = (packId && packs[packId]) || noItems;
  const swinging = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().survivor.attack !== null);
  const slot = selection?.source === 'inventory' ? inventory.findIndex((item) => item?.id === selection.id) : -1;
  const selected = selection?.source === 'inventory' ? inventory[slot]
    : (selection?.source === 'loot' ? items : packed).find((item) => item.id === selection?.id);
  const definition = selected && itemDefinitions[selected.kind];
  const firstEmpty = inventory.indexOf(null);
  const full = firstEmpty === -1;
  const occupiedSlots = inventory.filter(Boolean).length;
  const itemUse = selection?.source === 'inventory' && selected && selected.kind !== 'baseball_bat'
    ? coordinator.getItemUse(slot, selected.id) : null;
  const useReason = itemUse?.status === 'no_benefit' ? itemUse.reason : null;
  const packSelected = selected?.kind === 'backpack';
  const { weight, capacity, exertion } = carriedLoad(inventory, packId, packs);
  const shownWeight = Number(weight.toFixed(2));
  const containerName = container ? containerNames[container.type] ?? 'Container' : '';
  const equipped = !!selected && (selected.id === equippedId || selected.id === packId);
  const draggingToInventory = dragging !== null && dragging.source !== 'inventory';

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

  useLayoutEffect(() => {
    const target = focusAfterChange.current;
    if (!target) return;
    focusAfterChange.current = null;
    const button = target === 'transfer' ? transferButton.current
      : dialog.current?.querySelector<HTMLButtonElement>('.inventory-slot[aria-pressed="true"]');
    (button ?? close.current)?.focus();
  }, [selection]);

  function select(source: Selection['source'], id: string) {
    setSelection({ source, id });
    setFeedback(null);
  }

  function location(source: Selection['source'], id?: string): StorageLocation {
    if (source === 'inventory') return { kind: 'inventory' };
    return { kind: source === 'loot' ? 'container' : 'pack', id: id ?? (source === 'loot' ? container?.name : packId) ?? '' };
  }

  function transfer(from: Selection, to: Selection['source'], sourceId?: string) {
    const result = coordinator.transferStorage(location(from.source, sourceId), from.id, location(to));
    if (result.status !== 'transferred') {
      const messages = {
        inventory_full: 'Inventory full', storage_full: to === 'pack' ? 'Backpack full.' : 'Container full.',
        too_heavy: 'Too heavy to carry.', unequip_first: 'Unequip this item before moving it here.',
        no_nested_packs: 'A backpack cannot go inside another backpack.', unavailable: 'Item unavailable.',
      };
      setFeedback({ text: messages[result.status], error: true });
      return;
    }
    setMoveSource(null);
    audio.confirm('item');
    if (to === 'inventory') setReceived({ slot: result.slot, itemId: from.id });
    const item = (from.source === 'loot' ? items : from.source === 'pack' ? packed : inventory)
      .find((entry) => entry?.id === from.id);
    const name = item ? itemDefinitions[item.kind].name : 'Item';
    const destination = to === 'inventory' ? `slot ${result.slot + 1}`
      : to === 'loot' ? containerName : 'backpack';
    setFeedback({ text: `${name} moved to ${destination}.` });

    // Keep Transfer focused for consecutive looting. End at the moved item when that action is no longer available.
    if (from.source === 'loot' && to === 'inventory') {
      const next = items.find((entry) => entry.id !== from.id);
      focusAfterChange.current = next && coordinator.getState().survivor.inventory.includes(null) ? 'transfer' : 'item';
      setSelection(next ? { source: 'loot', id: next.id } : null);
      return;
    }
    focusAfterChange.current = 'item';
    setSelection({ source: to, id: from.id });
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

  function allowDrop(event: DragEvent, target: DropTarget | null) {
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
    if (from.source !== 'inventory') allowDrop(event, full ? null : firstEmpty);
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
      setFeedback({ text: 'Item unavailable.', error: true });
      return;
    }
    setSelection({ source: 'inventory', id: from.id });
    setReceived({ slot: to, itemId: from.id });
    setFeedback({ text: swaps ? `Swapped with slot ${to + 1}.` : `Moved to slot ${to + 1}.` });
  }

  function dropInInventory(event: DragEvent, to?: number) {
    const from = getDragSource(event);
    if (!from) return;
    event.preventDefault();
    endDrag();
    if (from.source !== 'inventory') transfer(from, 'inventory', from.storageId);
    else if (to !== undefined) moveItem(from, to);
  }

  function dropInStorage(event: DragEvent, to: 'loot' | 'pack') {
    const from = getDragSource(event);
    if (!from || from.source === to) return;
    event.preventDefault();
    endDrag();
    transfer(from, to, from.source === 'inventory' ? undefined : from.storageId);
  }

  function storageItems(contents: readonly ItemInstance[], source: 'loot' | 'pack', storageId: string) {
    return contents.map((item) => (
      <button key={item.id} className="inventory-slot" type="button" aria-label={itemDefinitions[item.kind].name}
        aria-pressed={selection?.source === source && selection.id === item.id} draggable
        data-dragging={dragging?.source === source && dragging.id === item.id}
        onDragStart={(event) => startDrag(event, { source, id: item.id, storageId })}
        onClick={() => select(source, item.id)}>
        <ItemIcon kind={item.kind} />
        {source === 'loot' && <span>{itemDefinitions[item.kind].name}</span>}
      </button>
    ));
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
    setFeedback(null);
    grid.current?.querySelector<HTMLButtonElement>(`[data-inventory-slot="${from.slot}"]`)?.focus();
  }

  function useSelectedItem() {
    if (selection?.source !== 'inventory') return;
    const result = coordinator.useItem(slot, selection.id);
    if (result.status === 'used' || result.status === 'wedged') {
      audio.confirm('use');
      setSelection(null);
      setMoveSource(null);
      setFeedback({
        text: result.status === 'wedged' ? 'Door wedged.' : `${survivalStatNames[result.stat]} ${roundSurvivalStat(result.value)} / 100`,
      });
      close.current?.focus();
    } else {
      setFeedback({ text: result.status === 'no_benefit' ? result.reason : 'Item unavailable.', error: true });
    }
  }

  function drop(from: InventorySource) {
    const result = coordinator.dropItem(from.slot, from.id);
    if (result.status === 'dropped') {
      setSelection(null);
      setMoveSource(null);
      setFeedback({ text: 'Item placed nearby.' });
      close.current?.focus();
    } else {
      const messages = {
        cannot_drop: 'Cannot drop item here.',
        swing_in_progress: 'Finish your swing first.',
        too_heavy: 'Lighten your inventory before removing the backpack.',
        pack_too_heavy: 'Unpack some items before dropping this backpack.',
        unavailable: 'Item unavailable.',
      };
      setFeedback({ text: messages[result.status], error: true });
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
      grid.current?.querySelector<HTMLButtonElement>(`[data-inventory-slot="${moveSource.slot}"]`)?.focus();
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
  const canTransfer = !!selected && selection?.source === 'loot' && !full;
  const transferHint = full ? 'Inventory full'
    : canTransfer ? `Next open slot: ${firstEmpty + 1}` : 'Select an item to transfer.';

  return (
    <dialog
      ref={dialog}
      aria-label={container ? `Loot ${containerName}` : 'Inventory'}
      className={`inventory-dialog${container ? ' inventory-dialog--loot' : ''}`}
      onCancel={(event) => event.preventDefault()}
      onKeyDown={keepFocusInside}
      onDragEnd={endDrag}
    >
      <div className="inventory-shell field-frame">
        <header className="inventory-header">
          <h2>{container ? 'Loot' : 'Inventory'}</h2>
          <button ref={close} className="inventory-close" type="button" aria-keyshortcuts={container ? 'Escape' : 'Escape I'}
            onClick={coordinator.closeInventoryPanel}>Close <kbd aria-hidden="true">Esc</kbd></button>
        </header>
        {container && (
          <section className="inventory-panel loot-source inventory-drop-area" aria-label="Container contents"
            data-drop-target={dropTarget === 'loot'} onDragLeave={leaveDropArea}
            onDragOver={(event) => { if (getDragSource(event)?.source !== 'loot') allowDrop(event, 'loot'); }}
            onDrop={(event) => dropInStorage(event, 'loot')}>
            <div className="inventory-section-heading">
              <h3>{containerName}</h3>
              <span>{items.length} {items.length === 1 ? 'item' : 'items'}</span>
            </div>
            {items.length === 0 ? (
              <div className="loot-empty"><strong>Empty</strong><span>Drag items here to store them.</span></div>
            ) : (
              <>
                <div className="loot-list">{storageItems(items, 'loot', container.name)}</div>
                <div className="loot-transfer">
                  <button
                    ref={transferButton}
                    className="inventory-action inventory-action--primary"
                    type="button"
                    disabled={!canTransfer}
                    aria-describedby={transferHintId}
                    onClick={() => { if (selection?.source === 'loot') transfer(selection, 'inventory'); }}
                  >
                    Transfer
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2.5 8h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </button>
                  <p id={transferHintId} className="inventory-hint" data-warning={full}>{transferHint}</p>
                </div>
              </>
            )}
          </section>
        )}
        <section className="inventory-panel inventory-storage" aria-label="Inventory slots">
          <div className="inventory-section-heading">
            <h3>{container ? 'Inventory' : 'Pockets'}</h3>
            <span>{occupiedSlots} / {inventory.length} slots</span>
          </div>
          <div className="inventory-carry" data-heavy={exertion > 0}>
            <meter min={0} max={capacity} value={Math.min(weight, capacity)} aria-label="Carried weight" />
            <span>{shownWeight} / {capacity} kg</span>
            {exertion > 0 && <strong title="Sprinting drains Stamina faster and recovery takes longer.">Heavy load</strong>}
          </div>
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
                title={item ? itemDefinitions[item.kind].name : undefined}
                draggable={!!item}
                data-inventory-slot={index}
                data-equipped={!!item && (item.id === equippedId || item.id === packId)}
                data-dragging={dragging?.source === 'inventory' && dragging.slot === index}
                data-drop-target={dropTarget === index}
                data-loot-receiver={draggingToInventory && firstEmpty === index}
                data-move-target={moveSource !== null && moveSource.slot !== index}
                onDragStart={(event) => { if (item) startDrag(event, { source: 'inventory', id: item.id, slot: index }); }}
                onDragOver={(event) => highlightInventoryTarget(event, index)}
                onDrop={(event) => dropInInventory(event, index)}
                onClick={() => pickSlot(index, item)}
              >
                {item && <ItemIcon kind={item.kind} />}
                {!item && (dropTarget === index || (draggingToInventory && firstEmpty === index))
                  && dragging && selected?.id === dragging.id && (
                  <span className="inventory-slot-preview"><ItemIcon kind={selected.kind} /></span>
                )}
                <span className="inventory-slot-number" aria-hidden="true">{index + 1}</span>
                {item && (item.id === equippedId || item.id === packId) && (
                  <span className="equipment-mark" aria-hidden="true">Equipped</span>
                )}
                {item && index === received?.slot && item.id === received.itemId && (
                  <span className="received-item" onAnimationEnd={() => setReceived(null)} />
                )}
              </button>
            ))}
          </div>
          <p className="inventory-hint" role="status">
            {moveSource ? `Moving from slot ${moveSource.slot + 1}. Choose a destination.` : draggingToInventory
              ? full ? 'Inventory full' : `Drop here to move the item to slot ${firstEmpty + 1}.`
              : occupiedSlots === 0 ? 'Your pockets are empty.' : 'Drag an item to move or swap it.'}
          </p>
          {packId && (
            <section className="pack-storage inventory-drop-area" aria-label="Backpack contents"
              data-drop-target={dropTarget === 'pack'} onDragLeave={leaveDropArea}
              onDragOver={(event) => { if (getDragSource(event)?.source !== 'pack') allowDrop(event, 'pack'); }}
              onDrop={(event) => dropInStorage(event, 'pack')}>
              <div className="inventory-section-heading">
                <h3>Backpack</h3>
                <span>{packed.length} / {backpackSlots} slots</span>
              </div>
              <div className="inventory-slots pack-slots">
                {storageItems(packed, 'pack', packId)}
                {Array.from({ length: backpackSlots - packed.length }, (_, index) =>
                  <span key={index} className="inventory-slot" aria-hidden="true" />)}
              </div>
            </section>
          )}
        </section>
        <section className="inventory-panel item-details" aria-label="Item details">
          {selected && definition ? (
            <>
              <div className="item-detail-heading">
                <ItemIcon kind={selected.kind} />
                <div>
                  <h3>{definition.name}</h3>
                  <p>{definition.category} · {Number(itemWeight(selected, packs).toFixed(2))} kg</p>
                  <p className="item-detail-location">{equipped ? 'Equipped' : selection?.source === 'inventory'
                    ? `Slot ${slot + 1}` : selection?.source === 'loot' ? containerName : 'Backpack'}</p>
                </div>
              </div>
              <p className="item-description">{definition.description}</p>
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
                            const changed = coordinator.toggleEquip(slot, selected.id);
                            if (changed) audio.confirm('equip');
                            setFeedback(changed ? null : { text: 'Item unavailable.', error: true });
                            return;
                          }
                          const result = coordinator.togglePack(slot, selected.id);
                          if (result === 'equipped' || result === 'unequipped') audio.confirm('equip');
                          setFeedback(result === 'too_heavy' ? {
                            text: 'Lighten your inventory before removing the backpack.', error: true,
                          } : null);
                        }}
                      >
                        {equipped ? 'Unequip' : 'Equip'}
                      </button>
                    ) : itemUse?.status !== 'unavailable' && (
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
              {selection && (
                <div className="inventory-actions storage-actions">
                  {selection.source === 'pack' && (
                    <button className="inventory-action inventory-action--primary" type="button"
                      disabled={full} aria-describedby={full ? 'unpack-inventory-full' : undefined}
                      onClick={() => transfer(selection, 'inventory')}>Unpack</button>
                  )}
                  {packId && selection.source !== 'pack' && selected.kind !== 'backpack' && !equipped && (
                    <button className="inventory-action" type="button" onClick={() => transfer(selection, 'pack')}>Pack</button>
                  )}
                  {container && selection.source !== 'loot' && !equipped && (
                    <button className="inventory-action" type="button" onClick={() => transfer(selection, 'loot')}>Store in {containerName}</button>
                  )}
                </div>
              )}
              {full && selection?.source === 'pack' && (
                <p id="unpack-inventory-full" className="inventory-muted">Inventory full</p>
              )}
            </>
          ) : (
            <>
              <h3>Item Details</h3>
              <p className="inventory-muted">{container ? 'Select an item to inspect it.' : 'Select an item to see what you can do with it.'}</p>
            </>
          )}
        </section>
        <footer className="inventory-footer">
          <p role="status" data-error={feedback?.error}>{feedback?.text}</p>
          {!feedback && <span>{container ? 'Drag items between the container and inventory.' : 'Move lets you choose a slot without dragging.'}</span>}
        </footer>
      </div>
    </dialog>
  );
}
