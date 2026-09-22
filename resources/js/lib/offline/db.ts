import type Dexie from 'dexie';
import type { Table } from 'dexie';
import type { ChecklistFormData } from '@/components/checklists/checklist-edit-form';
import type {
    ActiveUnitOption,
    ChecklistTemplateOption,
} from '@/components/checklists/checklist-create-modal';
import type {
    ChecklistsFilters,
    ChecklistsPagination,
} from '@/components/checklists/checklists-table';
import type { ChecklistsStatsData } from '@/components/checklists/checklists-stats';

export type OfflineCatalogItem = {
    id: number;
    parent_id: number | null;
    item_number: string | null;
    label: string;
    sort_order: number;
    has_expiry: boolean;
    check_type: string;
    weight: number | null;
};

export type OfflineCatalogTemplate = {
    id: number;
    type: string;
    code: string;
    name: string;
    version: string;
    notes_hint: string | null;
    items: OfflineCatalogItem[];
    signatureRoles: Array<{
        id: number;
        label: string;
        sort_order: number;
    }>;
    pareto: {
        weight_total: number;
        weight_ok: boolean;
    };
};

export type InspectionIndexSnapshot = {
    key: 'index';
    checklists: ChecklistsPagination;
    stats: ChecklistsStatsData;
    filters: ChecklistsFilters;
    templates: ChecklistTemplateOption[];
    activeUnits: ActiveUnitOption[];
    catalog: OfflineCatalogTemplate[];
    updatedAt: number;
};

export type InspectionEditSnapshot = {
    key: string;
    checklist: ChecklistFormData;
    updatedAt: number;
};

export type OfflineIdMap = {
    localId: string;
    serverId: number;
};

export type OutboxKind = 'create' | 'update' | 'photo' | 'delete-photo';

export type OutboxItem = {
    id: string;
    kind: OutboxKind;
    checklistId: string;
    createdAt: number;
    attempts: number;
    lastError?: string;
    payload: Record<string, unknown>;
};

export type OfflinePhoto = {
    id: string;
    checklistId: string;
    inspectionPass: 'first' | 'second';
    blob: Blob;
    capturedAt: string;
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
};

export type QueuedMutation = {
    id: string;
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    body: Record<string, unknown>;
    createdAt: number;
    attempts: number;
    lastError?: string;
};

type OfflineDatabase = Dexie & {
    indexSnapshots: Table<InspectionIndexSnapshot, string>;
    editSnapshots: Table<InspectionEditSnapshot, string>;
    outbox: Table<OutboxItem, string>;
    photos: Table<OfflinePhoto, string>;
    idMap: Table<OfflineIdMap, string>;
    mutations: Table<QueuedMutation, string>;
};

let instance: OfflineDatabase | null = null;
let loading: Promise<OfflineDatabase | null> | null = null;

export async function offlineDb(): Promise<OfflineDatabase | null> {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
        return null;
    }

    if (instance) {
        return instance;
    }

    if (!loading) {
        loading = import('dexie')
            .then(({ default: DexieCtor }) => {
                class AgrovisionOfflineDB extends DexieCtor {
                    indexSnapshots!: Table<InspectionIndexSnapshot, string>;
                    editSnapshots!: Table<InspectionEditSnapshot, string>;
                    outbox!: Table<OutboxItem, string>;
                    photos!: Table<OfflinePhoto, string>;
                    idMap!: Table<OfflineIdMap, string>;
                    mutations!: Table<QueuedMutation, string>;

                    constructor() {
                        super('agrovision-offline');

                        this.version(1).stores({
                            indexSnapshots: 'key, updatedAt',
                            editSnapshots: 'key, updatedAt',
                            outbox: 'id, kind, checklistId, createdAt',
                            photos: 'id, checklistId, inspectionPass',
                            idMap: 'localId, serverId',
                        });

                        this.version(2).stores({
                            mutations: 'id, createdAt, url',
                        });
                    }
                }

                instance = new AgrovisionOfflineDB();

                return instance;
            })
            .catch((error) => {
                loading = null;
                console.error('No se pudo abrir IndexedDB offline:', error);

                return null;
            });
    }

    return loading;
}

export function editSnapshotKey(id: number | string): string {
    return `edit:${id}`;
}
