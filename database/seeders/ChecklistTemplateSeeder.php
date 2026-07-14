<?php

namespace Database\Seeders;

use App\Models\ChecklistItem;
use App\Models\ChecklistSignatureRole;
use App\Models\ChecklistTemplate;
use Illuminate\Database\Seeder;

class ChecklistTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedTdp();
        $this->seedTdc();
    }

    private function seedTdp(): void
    {
        $template = ChecklistTemplate::query()->updateOrCreate(
            ['type' => 'tdp'],
            [
                'code' => 'PE-F-SST-057',
                'name' => 'Check List TDP – Unidades móviles propias, alquiladas y de terceros',
                'version' => '1',
                'notes_hint' => 'Tarjeta de propiedad: indicar en la inspección si hay más personas transportadas en el vehículo respecto al número de asientos que indica la tarjeta de propiedad, y/u otras observaciones.',
                'is_active' => true,
            ],
        );

        ChecklistItem::query()->where('template_id', $template->id)->delete();
        ChecklistSignatureRole::query()->where('template_id', $template->id)->delete();

        $sort = 0;
        $items = [
            ['1', 'Tarjeta de propiedad', false],
            ['2', 'SOAT vigente – Fecha de vencimiento:', true],
            ['3', 'SCTR vigente – Fecha de vencimiento:', true],
            ['4', 'Revisión técnica vigente – Fecha de vencimiento:', true],
            ['5', 'Estado de luces generales:', false, [
                ['a', 'Luz corta'],
                ['b', 'Luz larga'],
                ['c', 'Intermitente derecho'],
                ['d', 'Intermitente izquierdo'],
                ['e', 'Luz de estacionamiento'],
                ['f', 'Luz de retroceso'],
            ]],
            ['6', 'Claxon', false],
            ['7', 'Alarma de retroceso', false],
            ['8', 'Llantas con cocada mínima de 4 mm', false],
            ['9', 'Llanta de repuesto', false],
            ['10', 'Gata', false],
            ['11', 'Estado de ruedas', false],
            ['12', 'Plumillas operativas', false],
            ['13', 'Botiquín', false],
            ['14', 'Extintor – Fecha de vencimiento:', true],
            ['15', 'Conos o triángulos de seguridad', false],
            ['16', 'Tacos', false],
            ['17', 'Espejos laterales operativos', false],
            ['18', 'Cinturones de seguridad', false],
            ['19', 'Salidas de emergencia', false],
            ['20', 'Accesorios de salidas de emergencia (martillos)', false],
            ['21', 'Ventanas de emergencia señalizadas', false],
            ['22', 'Cuenta con estrobo / tiro o cable de desenganche', false],
            ['23', 'Cintas retro reflectivas', false],
            ['24', 'Pasos o pasadizos en buen estado', false],
            ['25', 'Asiento con espaldar y pernos completos', false],
            ['26', 'Estado de asientos', false],
            ['27', 'Luna delantera libre de obstáculos que impidan la visualización del conductor', false],
            ['28', 'Estado de los pedales', false],
            ['29', 'Estado de las herramientas', false],
            ['30', 'Productos químicos autorizados y rotulados', false],
            ['31', 'Flayer de uso de cinturón de seguridad', false],
            ['32', 'Flayer de números de emergencia', false],
        ];

        $this->seedItems($template->id, $items, $sort);

        foreach ([
            'Conductor de la unidad',
            'Mecánico de mantenimiento',
            'Jefe del área de transporte',
            'V°B° SST',
        ] as $index => $label) {
            ChecklistSignatureRole::query()->create([
                'template_id' => $template->id,
                'label' => $label,
                'sort_order' => $index + 1,
            ]);
        }
    }

    private function seedTdc(): void
    {
        $template = ChecklistTemplate::query()->updateOrCreate(
            ['type' => 'tdc'],
            [
                'code' => 'PE-F-SST-058',
                'name' => 'Check List TDC – Unidades camionetas de carga',
                'version' => '1',
                'notes_hint' => 'Tarjeta de propiedad: indicar en la inspección si hay más personas transportadas en el vehículo respecto al número de asientos que indica la tarjeta de propiedad, y/u otras observaciones.',
                'is_active' => true,
            ],
        );

        ChecklistItem::query()->where('template_id', $template->id)->delete();
        ChecklistSignatureRole::query()->where('template_id', $template->id)->delete();

        $sort = 0;
        $items = [
            ['1', 'Tarjeta de propiedad', false],
            ['2', 'SOAT vigente – Fecha de vencimiento:', true],
            ['3', 'SCTR vigente – Fecha de vencimiento:', true],
            ['4', 'Revisión técnica vigente – Fecha de vencimiento:', true],
            ['5', 'Estado de luces generales:', false, [
                ['a', 'Luz corta'],
                ['b', 'Luz larga'],
                ['c', 'Intermitente derecho'],
                ['d', 'Intermitente izquierdo'],
                ['e', 'Luz de estacionamiento'],
                ['f', 'Luz de retroceso'],
            ]],
            ['6', 'Claxon', false],
            ['7', 'Alarma de retroceso', false],
            ['8', 'Llantas con cocada mínima de 4 mm', false],
            ['9', 'Llanta de repuesto', false],
            ['10', 'Gata', false],
            ['11', 'Estado de ruedas', false],
            ['12', 'Plumillas operativas', false],
            ['13', 'Botiquín', false],
            ['14', 'Extintor – Fecha de vencimiento:', true],
            ['15', 'Conos o triángulos de seguridad', false],
            ['16', 'Tacos', false],
            ['17', 'Espejos laterales operativos', false],
            ['18', 'Cinturones de seguridad', false],
            ['19', 'Cintas retro reflectivas', false],
            ['20', 'Asiento con espaldar y pernos completos', false],
            ['21', 'Estado de asientos', false],
        ];

        $this->seedItems($template->id, $items, $sort);

        foreach ([
            'Conductor de la unidad',
            'Responsable del área usuaria',
            'Gerencia de operaciones',
            'V°B° SST',
        ] as $index => $label) {
            ChecklistSignatureRole::query()->create([
                'template_id' => $template->id,
                'label' => $label,
                'sort_order' => $index + 1,
            ]);
        }
    }

    /**
     * @param  list<array{0: string, 1: string, 2: bool, 3?: list<array{0: string, 1: string}>}>  $items
     */
    private function seedItems(int $templateId, array $items, int &$sort): void
    {
        foreach ($items as $item) {
            $sort++;
            $parent = ChecklistItem::query()->create([
                'template_id' => $templateId,
                'parent_id' => null,
                'item_number' => $item[0],
                'label' => $item[1],
                'sort_order' => $sort,
                'has_expiry' => $item[2],
            ]);

            if (! isset($item[3])) {
                continue;
            }

            foreach ($item[3] as $child) {
                $sort++;
                ChecklistItem::query()->create([
                    'template_id' => $templateId,
                    'parent_id' => $parent->id,
                    'item_number' => $child[0],
                    'label' => $child[1],
                    'sort_order' => $sort,
                    'has_expiry' => false,
                ]);
            }
        }
    }
}
