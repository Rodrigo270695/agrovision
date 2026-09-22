import type { ChecklistFormData } from '@/components/checklists/checklist-edit-form';
import type { ChecklistPhoto } from '@/components/checklists/checklist-photos-section';
import type {
    ActiveUnitOption,
    ChecklistTemplateOption,
} from '@/components/checklists/checklist-create-modal';
import type { ChecklistItemRow } from '@/components/checklists/checklists-table';
import {
    editSnapshotKey,
    offlineDb,
    type InspectionIndexSnapshot,
    type OfflineCatalogTemplate,
    type OfflinePhoto,
    type OutboxItem,
} from '@/lib/offline/db';
import {
    isLocalChecklistId,
    newLocalChecklistId,
    newOutboxId,
} from '@/lib/offline/ids';
import { setOfflinePending } from '@/lib/offline/status';

export async function refreshPendingCount(): Promise<number> {
    const db = await offlineDb();

    if (!db) {
        setOfflinePending(0);

        return 0;
    }

    const pending = await db.outbox.count();
    setOfflinePending(pending);

    return pending;
}

export async function saveIndexSnapshot(
    snapshot: Omit<InspectionIndexSnapshot, 'key' | 'updatedAt'>,
): Promise<void> {
    const db = await offlineDb();

    if (!db) {
        return;
    }

    await db.indexSnapshots.put({
        ...snapshot,
        key: 'index',
        updatedAt: Date.now(),
    });
}

export async function getIndexSnapshot(): Promise<InspectionIndexSnapshot | null> {
    const db = await offlineDb();

    if (!db) {
        return null;
    }

    return (await db.indexSnapshots.get('index')) ?? null;
}

export async function saveEditSnapshot(checklist: ChecklistFormData): Promise<void> {
    const db = await offlineDb();

    if (!db) {
        return;
    }

    await db.editSnapshots.put({
        key: editSnapshotKey(checklist.id),
        checklist,
        updatedAt: Date.now(),
    });
}

export async function getEditSnapshot(
    id: number | string,
): Promise<ChecklistFormData | null> {
    const db = await offlineDb();

    if (!db) {
        return null;
    }

    const mapped = isLocalChecklistId(id)
        ? null
        : await db.idMap.where('serverId').equals(Number(id)).first();
    const key = mapped
        ? editSnapshotKey(mapped.localId)
        : editSnapshotKey(id);
    const row = (await db.editSnapshots.get(editSnapshotKey(id)))
        ?? (await db.editSnapshots.get(key));

    return row?.checklist ?? null;
}

export async function listLocalDrafts(): Promise<ChecklistFormData[]> {
    const db = await offlineDb();

    if (!db) {
        return [];
    }

    const rows = await db.editSnapshots.toArray();

    return rows
        .map((row) => row.checklist)
        .filter((checklist) => isLocalChecklistId(checklist.id));
}

export async function enqueueOutbox(
    item: Omit<OutboxItem, 'id' | 'createdAt' | 'attempts'>,
): Promise<string> {
    const db = await offlineDb();
    const id = newOutboxId();

    if (!db) {
        return id;
    }

    if (item.kind === 'update') {
        const previous = await db.outbox
            .where('checklistId')
            .equals(item.checklistId)
            .and((row) => row.kind === 'update')
            .toArray();

        if (previous.length > 0) {
            await db.outbox.bulkDelete(previous.map((row) => row.id));
        }
    }

    await db.outbox.add({
        ...item,
        id,
        createdAt: Date.now(),
        attempts: 0,
    });
    await refreshPendingCount();

    return id;
}

export async function queueCreate(payload: {
    unit_id: number;
    template_id: number;
    checklistId: string;
}): Promise<void> {
    await enqueueOutbox({
        kind: 'create',
        checklistId: payload.checklistId,
        payload: {
            unit_id: payload.unit_id,
            template_id: payload.template_id,
        },
    });
}

export async function queueUpdate(
    checklistId: number | string,
    payload: Record<string, unknown>,
): Promise<void> {
    await enqueueOutbox({
        kind: 'update',
        checklistId: String(checklistId),
        payload,
    });
}

export async function queuePhoto(photo: OfflinePhoto): Promise<void> {
    const db = await offlineDb();

    if (db) {
        await db.photos.put(photo);
    }

    await enqueueOutbox({
        kind: 'photo',
        checklistId: photo.checklistId,
        payload: { photoId: photo.id },
    });
}

export async function queueDeletePhoto(
    checklistId: number | string,
    photoId: number | string,
): Promise<void> {
    const db = await offlineDb();

    if (db && typeof photoId === 'string') {
        await db.photos.delete(photoId);
        const pending = await db.outbox
            .where('checklistId')
            .equals(String(checklistId))
            .and(
                (row) =>
                    row.kind === 'photo' && row.payload.photoId === photoId,
            )
            .toArray();

        if (pending.length > 0) {
            await db.outbox.bulkDelete(pending.map((row) => row.id));
            await refreshPendingCount();

            return;
        }
    }

    await enqueueOutbox({
        kind: 'delete-photo',
        checklistId: String(checklistId),
        payload: { photoId },
    });
}

export async function listPendingPhotos(
    checklistId: number | string,
): Promise<OfflinePhoto[]> {
    const db = await offlineDb();

    if (!db) {
        return [];
    }

    return db.photos.where('checklistId').equals(String(checklistId)).toArray();
}

export function photoToView(photo: OfflinePhoto): ChecklistPhoto {
    return {
        id: photo.id,
        inspection_pass: photo.inspectionPass,
        url: URL.createObjectURL(photo.blob),
        captured_at: photo.capturedAt.replace('T', ' '),
        latitude: photo.latitude,
        longitude: photo.longitude,
        accuracy: photo.accuracy,
    };
}

export async function deleteLocalDraft(id: number | string): Promise<void> {
    const db = await offlineDb();

    if (!db) {
        return;
    }

    const checklistId = String(id);
    const snapshot = await db.editSnapshots.get(editSnapshotKey(id));
    const photos = await db.photos.where('checklistId').equals(checklistId).toArray();
    const outbox = await db.outbox.where('checklistId').equals(checklistId).toArray();

    await db.transaction(
        'rw',
        db.editSnapshots,
        db.photos,
        db.outbox,
        db.idMap,
        async () => {
            if (snapshot) {
                await db.editSnapshots.delete(editSnapshotKey(id));
            }

            await db.photos.bulkDelete(photos.map((photo) => photo.id));
            await db.outbox.bulkDelete(outbox.map((item) => item.id));
            await db.idMap.delete(checklistId);
        },
    );
    await refreshPendingCount();
}

export function draftToRow(checklist: ChecklistFormData): ChecklistItemRow {
    return {
        id: checklist.id,
        plate_number: checklist.plate_number,
        driver_name: checklist.driver_name,
        provider: checklist.provider,
        status: checklist.status,
        sealed_at: checklist.sealed_at,
        first_result: checklist.first_result,
        second_result: checklist.second_result,
        coordinator_status: checklist.coordinator_status ?? null,
        created_at: new Date().toISOString(),
        pending_sync: true,
        template: {
            id: checklist.template.id,
            type: checklist.template.type,
            code: checklist.template.code,
            name: checklist.template.name,
        },
        period: checklist.period
            ? {
                  id: checklist.period.id,
                  name: checklist.period.name,
                  date: checklist.period.date,
                  status: checklist.period.status,
              }
            : null,
    };
}

export function buildLocalDraft(input: {
    unit: ActiveUnitOption;
    template: ChecklistTemplateOption;
    catalog: OfflineCatalogTemplate;
}): ChecklistFormData {
    const plate = input.unit.plate_number || input.unit.correlative;

    return {
        id: newLocalChecklistId(),
        status: 'draft',
        is_sealed: false,
        sealed_at: null,
        plate_number: plate,
        driver_name: input.unit.driver_name ?? null,
        provider: input.unit.provider ?? null,
        location: null,
        transport_company: input.unit.provider ?? null,
        vehicle_info: null,
        license_number: null,
        license_class: input.unit.category ?? null,
        license_revalidation_on: null,
        first_inspected_on: null,
        first_inspected_time: null,
        second_inspected_on: null,
        second_inspected_time: null,
        first_result: null,
        second_result: null,
        additional_observations: null,
        coordinator_status: null,
        sent_to_coordinator_at: null,
        coordinator_action_plan: null,
        can_send_to_coordinator: false,
        can_start_second: false,
        period: input.unit.period
            ? {
                  id: input.unit.period.id,
                  name: input.unit.period.name,
                  status: input.unit.period.status,
              }
            : null,
        template: {
            id: input.catalog.id,
            type: input.catalog.type,
            code: input.catalog.code,
            name: input.catalog.name,
            version: input.catalog.version,
            notes_hint: input.catalog.notes_hint,
        },
        items: input.catalog.items.map((item) => ({
            id: item.id,
            parent_id: item.parent_id,
            item_number: item.item_number,
            label: item.label,
            sort_order: item.sort_order,
            has_expiry: item.has_expiry,
            check_type: item.check_type,
            weight: item.weight,
            first_value: null,
            second_value: null,
            observations: null,
        })),
        pareto: input.catalog.pareto,
        signatures: input.catalog.signatureRoles.map((role) => ({
            signature_role_id: role.id,
            label: role.label,
            signer_name: role.sort_order === 1 ? input.unit.driver_name ?? null : null,
            signature_url: null,
            signed_at: null,
        })),
        photos: [],
    };
}

export function applyUpdateToChecklist(
    checklist: ChecklistFormData,
    payload: Record<string, unknown>,
): ChecklistFormData {
    const answers = Array.isArray(payload.answers)
        ? (payload.answers as Array<{
              checklist_item_id: number;
              first_value?: string | null;
              second_value?: string | null;
              observations?: string | null;
          }>)
        : [];

    const answersById = new Map(
        answers.map((answer) => [answer.checklist_item_id, answer]),
    );

    return {
        ...checklist,
        location: (payload.location as string | null) ?? checklist.location,
        transport_company:
            (payload.transport_company as string | null) ??
            checklist.transport_company,
        vehicle_info:
            (payload.vehicle_info as string | null) ?? checklist.vehicle_info,
        license_number:
            (payload.license_number as string | null) ?? checklist.license_number,
        license_class:
            (payload.license_class as string | null) ?? checklist.license_class,
        license_revalidation_on:
            (payload.license_revalidation_on as string | null) ??
            checklist.license_revalidation_on,
        driver_name:
            (payload.driver_name as string | null) ?? checklist.driver_name,
        first_inspected_on:
            (payload.first_inspected_on as string | null) ??
            checklist.first_inspected_on,
        first_inspected_time:
            (payload.first_inspected_time as string | null) ??
            checklist.first_inspected_time,
        second_inspected_on:
            (payload.second_inspected_on as string | null) ??
            checklist.second_inspected_on,
        second_inspected_time:
            (payload.second_inspected_time as string | null) ??
            checklist.second_inspected_time,
        first_result:
            (payload.first_result as ChecklistFormData['first_result']) ??
            checklist.first_result,
        second_result:
            (payload.second_result as ChecklistFormData['second_result']) ??
            checklist.second_result,
        additional_observations:
            (payload.additional_observations as string | null) ??
            checklist.additional_observations,
        status:
            (payload.status as ChecklistFormData['status']) ?? checklist.status,
        items: checklist.items.map((item) => {
            const answer = answersById.get(item.id);

            if (!answer) {
                return item;
            }

            return {
                ...item,
                first_value:
                    (answer.first_value as ChecklistFormData['items'][number]['first_value']) ??
                    null,
                second_value:
                    (answer.second_value as ChecklistFormData['items'][number]['second_value']) ??
                    null,
                observations: answer.observations ?? null,
            };
        }),
    };
}
