import {
    ExternalLink,
    PauseCircle,
    Pencil,
    PlayCircle,
    ScreenShare,
} from 'lucide-react';
import { RowActionsMenu } from '@/components/shared/row-actions-menu';

export type TenantActionRow = {
    id: string;
    name: string;
    status: string;
    url: string;
};

type Props = {
    tenant: TenantActionRow;
    onEdit: (tenant: TenantActionRow) => void;
    onEnterSupport: (tenant: TenantActionRow) => void;
    onToggleStatus: (tenant: TenantActionRow) => void;
};

export function TenantRowActions({
    tenant,
    onEdit,
    onEnterSupport,
    onToggleStatus,
}: Props) {
    const isActive = tenant.status === 'active';

    return (
        <RowActionsMenu
            label={`Acciones de ${tenant.name}`}
            items={[
                {
                    key: 'open',
                    label: 'Abrir subdominio',
                    icon: ExternalLink,
                    href: tenant.url,
                    target: '_blank',
                },
                {
                    key: 'support',
                    label: 'Entrar como soporte',
                    icon: ScreenShare,
                    disabled: !isActive,
                    onSelect: () => onEnterSupport(tenant),
                },
                {
                    key: 'edit',
                    label: 'Editar',
                    icon: Pencil,
                    onSelect: () => onEdit(tenant),
                },
                {
                    key: 'toggle',
                    label: isActive ? 'Suspender' : 'Activar',
                    icon: isActive ? PauseCircle : PlayCircle,
                    tone: isActive ? 'warning' : 'success',
                    separatorBefore: true,
                    onSelect: () => onToggleStatus(tenant),
                },
            ]}
        />
    );
}
