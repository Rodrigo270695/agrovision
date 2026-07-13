<?php

namespace Database\Seeders;

use App\Models\ChecklistItem;
use App\Models\ChecklistSignatureSlot;
use App\Models\ChecklistTemplate;
use App\Models\ChecklistTemplateVersion;
use Illuminate\Database\Seeder;

class ChecklistTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedTemplate(
            code: 'PE-F-SST-057',
            shortCode: 'TDP',
            name: 'Check list SST — Unidades móviles propias, alquiladas y de terceros',
            unitType: 'tdp',
            documentTitle: 'CHECK LIST DE INSPECCIÓN – EXIGENCIAS DE SST PARA UNIDADES MÓVILES PROPIAS, ALQUILADAS Y DE TERCEROS (TDP)',
            items: $this->tdpItems(),
            signatures: [
                ['role' => 'conductor', 'label' => 'Conductor de la unidad', 'sort_order' => 1],
                ['role' => 'mecanico_mantenimiento', 'label' => 'Mecánico de mantenimiento', 'sort_order' => 2],
                ['role' => 'jefe_transporte', 'label' => 'Jefe del área de transporte', 'sort_order' => 3],
                ['role' => 'vb_sst', 'label' => 'V°B° SST', 'sort_order' => 4],
            ],
        );

        $this->seedTemplate(
            code: 'PE-F-SST-058',
            shortCode: 'TDC',
            name: 'Check list SST — Unidades camionetas de carga',
            unitType: 'tdc',
            documentTitle: 'CHECK LIST DE INSPECCIÓN – EXIGENCIAS DE SST PARA UNIDADES CAMIONETAS DE CARGA (TDC)',
            items: $this->tdcItems(),
            signatures: [
                ['role' => 'conductor', 'label' => 'Conductor de la unidad', 'sort_order' => 1],
                ['role' => 'responsable_area_usuaria', 'label' => 'Responsable del área usuaria', 'sort_order' => 2],
                ['role' => 'gerencia_operaciones', 'label' => 'Gerencia de operaciones', 'sort_order' => 3],
                ['role' => 'vb_sst', 'label' => 'V°B° SST', 'sort_order' => 4],
            ],
        );
    }

    /**
     * @param  list<array{item_code: string, item_number: string, label: string, is_group?: bool, requires_expiry?: bool, parent_code?: string|null}>  $items
     * @param  list<array{role: string, label: string, sort_order: int}>  $signatures
     */
    private function seedTemplate(
        string $code,
        string $shortCode,
        string $name,
        string $unitType,
        string $documentTitle,
        array $items,
        array $signatures,
    ): void {
        $template = ChecklistTemplate::query()->updateOrCreate(
            ['code' => $code],
            [
                'short_code' => $shortCode,
                'name' => $name,
                'unit_type' => $unitType,
                'description' => $documentTitle,
                'is_active' => true,
            ],
        );

        $version = ChecklistTemplateVersion::query()->updateOrCreate(
            [
                'checklist_template_id' => $template->id,
                'version_number' => 1,
            ],
            [
                'effective_from' => '2026-01-01',
                'document_title' => $documentTitle,
                'is_published' => true,
            ],
        );

        $version->items()->delete();
        $version->signatureSlots()->delete();

        $created = [];
        $sort = 1;

        foreach ($items as $item) {
            $parentId = null;
            if (! empty($item['parent_code'])) {
                $parentId = $created[$item['parent_code']] ?? null;
            }

            $model = ChecklistItem::query()->create([
                'checklist_template_version_id' => $version->id,
                'parent_item_id' => $parentId,
                'item_code' => $item['item_code'],
                'item_number' => $item['item_number'],
                'sort_order' => $sort++,
                'label' => $item['label'],
                'is_group' => $item['is_group'] ?? false,
                'is_required' => true,
                'requires_expiry' => $item['requires_expiry'] ?? false,
            ]);

            $created[$item['item_code']] = $model->id;
        }

        foreach ($signatures as $slot) {
            ChecklistSignatureSlot::query()->create([
                'checklist_template_version_id' => $version->id,
                'role' => $slot['role'],
                'label' => $slot['label'],
                'sort_order' => $slot['sort_order'],
                'is_required' => true,
            ]);
        }
    }

    /**
     * @return list<array{item_code: string, item_number: string, label: string, is_group?: bool, requires_expiry?: bool, parent_code?: string|null}>
     */
    private function sharedBaseItems(string $prefix): array
    {
        return [
            ['item_code' => "{$prefix}-01", 'item_number' => '1', 'label' => 'Tarjeta de propiedad'],
            ['item_code' => "{$prefix}-02", 'item_number' => '2', 'label' => 'SOAT vigente', 'requires_expiry' => true],
            ['item_code' => "{$prefix}-03", 'item_number' => '3', 'label' => 'SCTR vigente', 'requires_expiry' => true],
            ['item_code' => "{$prefix}-04", 'item_number' => '4', 'label' => 'Revisión técnica vigente', 'requires_expiry' => true],
            ['item_code' => "{$prefix}-05", 'item_number' => '5', 'label' => 'Estado de luces generales', 'is_group' => true],
            ['item_code' => "{$prefix}-05A", 'item_number' => '5a', 'label' => 'Luz corta', 'parent_code' => "{$prefix}-05"],
            ['item_code' => "{$prefix}-05B", 'item_number' => '5b', 'label' => 'Luz larga', 'parent_code' => "{$prefix}-05"],
            ['item_code' => "{$prefix}-05C", 'item_number' => '5c', 'label' => 'Intermitente derecho', 'parent_code' => "{$prefix}-05"],
            ['item_code' => "{$prefix}-05D", 'item_number' => '5d', 'label' => 'Intermitente izquierdo', 'parent_code' => "{$prefix}-05"],
            ['item_code' => "{$prefix}-05E", 'item_number' => '5e', 'label' => 'Luz de estacionamiento', 'parent_code' => "{$prefix}-05"],
            ['item_code' => "{$prefix}-05F", 'item_number' => '5f', 'label' => 'Luz de retroceso', 'parent_code' => "{$prefix}-05"],
            ['item_code' => "{$prefix}-06", 'item_number' => '6', 'label' => 'Claxon'],
            ['item_code' => "{$prefix}-07", 'item_number' => '7', 'label' => 'Alarma de retroceso'],
            ['item_code' => "{$prefix}-08", 'item_number' => '8', 'label' => 'Llantas con cocada mínima de 4 mm'],
            ['item_code' => "{$prefix}-09", 'item_number' => '9', 'label' => 'Llanta de repuesto'],
            ['item_code' => "{$prefix}-10", 'item_number' => '10', 'label' => 'Gata'],
            ['item_code' => "{$prefix}-11", 'item_number' => '11', 'label' => 'Estado de ruedas'],
            ['item_code' => "{$prefix}-12", 'item_number' => '12', 'label' => 'Plumillas operativas'],
            ['item_code' => "{$prefix}-13", 'item_number' => '13', 'label' => 'Botiquín'],
            ['item_code' => "{$prefix}-14", 'item_number' => '14', 'label' => 'Extintor', 'requires_expiry' => true],
            ['item_code' => "{$prefix}-15", 'item_number' => '15', 'label' => 'Conos o triángulos de seguridad'],
            ['item_code' => "{$prefix}-16", 'item_number' => '16', 'label' => 'Tacos'],
            ['item_code' => "{$prefix}-17", 'item_number' => '17', 'label' => 'Espejos laterales operativos'],
            ['item_code' => "{$prefix}-18", 'item_number' => '18', 'label' => 'Cinturones de seguridad'],
        ];
    }

    /**
     * @return list<array{item_code: string, item_number: string, label: string, is_group?: bool, requires_expiry?: bool, parent_code?: string|null}>
     */
    private function tdpItems(): array
    {
        return [
            ...$this->sharedBaseItems('TDP'),
            ['item_code' => 'TDP-19', 'item_number' => '19', 'label' => 'Salidas de emergencia'],
            ['item_code' => 'TDP-20', 'item_number' => '20', 'label' => 'Accesorios de salidas de emergencia (martillos)'],
            ['item_code' => 'TDP-21', 'item_number' => '21', 'label' => 'Ventanas de emergencia señalizadas'],
            ['item_code' => 'TDP-22', 'item_number' => '22', 'label' => 'Cuenta con estrobo / tiro o cable de desenganche'],
            ['item_code' => 'TDP-23', 'item_number' => '23', 'label' => 'Cintas retro reflectivas'],
            ['item_code' => 'TDP-24', 'item_number' => '24', 'label' => 'Pasos o pasadizos en buen estado'],
            ['item_code' => 'TDP-25', 'item_number' => '25', 'label' => 'Asiento con espaldar y pernos completos'],
            ['item_code' => 'TDP-26', 'item_number' => '26', 'label' => 'Estado de asientos'],
            ['item_code' => 'TDP-27', 'item_number' => '27', 'label' => 'Luna delantera libre de obstáculos que impidan la visualización del conductor'],
            ['item_code' => 'TDP-28', 'item_number' => '28', 'label' => 'Estado de los pedales'],
            ['item_code' => 'TDP-29', 'item_number' => '29', 'label' => 'Estado de las herramientas'],
            ['item_code' => 'TDP-30', 'item_number' => '30', 'label' => 'Productos químicos autorizados y rotulados'],
            ['item_code' => 'TDP-31', 'item_number' => '31', 'label' => 'Flayer de uso de cinturón de seguridad'],
            ['item_code' => 'TDP-32', 'item_number' => '32', 'label' => 'Flayer de números de emergencia'],
        ];
    }

    /**
     * @return list<array{item_code: string, item_number: string, label: string, is_group?: bool, requires_expiry?: bool, parent_code?: string|null}>
     */
    private function tdcItems(): array
    {
        return [
            ...$this->sharedBaseItems('TDC'),
            ['item_code' => 'TDC-19', 'item_number' => '19', 'label' => 'Cintas retro reflectivas'],
            ['item_code' => 'TDC-20', 'item_number' => '20', 'label' => 'Asiento con espaldar y pernos completos'],
            ['item_code' => 'TDC-21', 'item_number' => '21', 'label' => 'Estado de asientos'],
        ];
    }
}
