<?php

namespace App\Support;

final class TenantTables
{
    /**
     * Tablas de negocio que viven en el schema del tenant.
     *
     * @return list<string>
     */
    public static function names(): array
    {
        return [
            'users',
            'password_reset_tokens',
            'sessions',
            'passkeys',
            'permissions',
            'roles',
            'model_has_permissions',
            'model_has_roles',
            'role_has_permissions',
            'periods',
            'units',
            'unit_documents',
            'rc_insurances',
            'rc_insurance_movements',
            'rc_insurance_status_events',
            'gps_records',
            'gps_movements',
            'gps_status_events',
            'checklist_templates',
            'checklist_items',
            'checklist_signature_roles',
            'unit_checklists',
            'inspection_batches',
            'unit_checklist_answers',
            'unit_checklist_signatures',
            'unit_checklist_photos',
            'inductions',
            'induction_types',
            'induction_attendees',
            'pareto',
            'alcohol_test_packages',
            'alcohol_tests',
            'push_subscriptions',
            'tenant_settings',
        ];
    }
}
