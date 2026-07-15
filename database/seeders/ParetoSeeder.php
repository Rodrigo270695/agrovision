<?php

namespace Database\Seeders;

use App\Models\Pareto;
use App\Support\ParetoCheckTypes;
use Illuminate\Database\Seeder;

class ParetoSeeder extends Seeder
{
    public function run(): void
    {
        Pareto::query()->delete();

        $this->seedTemplate('tdp', $this->tdpItems());
        $this->seedTemplate('tdc', $this->tdcItems());
    }

    /**
     * @param  list<array{0: string, 1: string, 2: bool, 3?: list<array{0: string, 1: string}>}>  $items
     */
    private function seedTemplate(string $templateType, array $items): void
    {
        $flat = [];
        $sort = 0;

        foreach ($items as $row) {
            $children = $row[3] ?? [];
            $flat[] = [
                'item_number' => $row[0],
                'label' => $row[1],
                'check_type' => ParetoCheckTypes::fromHasExpiry((bool) $row[2]),
                'sort_order' => $sort++,
                'parent_key' => null,
                'key' => $row[0],
            ];

            foreach ($children as $child) {
                $flat[] = [
                    'item_number' => $child[0],
                    'label' => $child[1],
                    'check_type' => ParetoCheckTypes::OBSERVATION,
                    'sort_order' => $sort++,
                    'parent_key' => $row[0],
                    'key' => $row[0].'-'.$child[0],
                ];
            }
        }

        $count = count($flat);
        $base = $count > 0 ? round(100 / $count, 2) : 0;
        $assigned = 0.0;

        $created = [];

        foreach ($flat as $index => $item) {
            $isLast = $index === $count - 1;
            $weight = $isLast ? round(100 - $assigned, 2) : $base;

            if (! $isLast) {
                $assigned += $base;
            }

            $parentId = null;
            if ($item['parent_key'] !== null && isset($created[$item['parent_key']])) {
                $parentId = $created[$item['parent_key']];
            }

            $model = Pareto::query()->create([
                'template_type' => $templateType,
                'parent_id' => $parentId,
                'item_number' => $item['item_number'],
                'label' => $item['label'],
                'sort_order' => $item['sort_order'],
                'check_type' => $item['check_type'],
                'weight' => $weight,
                'is_active' => true,
            ]);

            if ($item['parent_key'] === null) {
                $created[$item['key']] = $model->id;
            }
        }
    }

    /**
     * @return list<array{0: string, 1: string, 2: bool, 3?: list<array{0: string, 1: string}>}>
     */
    private function tdpItems(): array
    {
        return [
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
    }

    /**
     * @return list<array{0: string, 1: string, 2: bool, 3?: list<array{0: string, 1: string}>}>
     */
    private function tdcItems(): array
    {
        return [
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
    }
}
