import json
import re
from copy import deepcopy

from sqlalchemy.orm import Session

from app.models.permission_group import PermissionGroup


PERMISSION_CATALOG = [
    {
        'key': 'home',
        'label': 'Inicio',
        'description': 'Tela inicial administrativa e cards principais.',
        'screen_type': 'admin',
        'screen_type_label': 'Administrador',
        'actions': [
            {'key': 'view', 'label': 'Visualizar'},
        ],
    },
    {
        'key': 'dashboard',
        'label': 'Dashboard',
        'description': 'Indicadores, filtros e tabela de unidades.',
        'screen_type': 'admin',
        'screen_type_label': 'Administrador',
        'actions': [
            {'key': 'view', 'label': 'Visualizar'},
            {'key': 'export', 'label': 'Exportar'},
        ],
    },
    {
        'key': 'users',
        'label': 'Usuarios',
        'description': 'Cadastro, edicao, acesso e unidades dos usuarios.',
        'screen_type': 'admin',
        'screen_type_label': 'Administrador',
        'actions': [
            {'key': 'view', 'label': 'Visualizar'},
            {'key': 'create', 'label': 'Criar'},
            {'key': 'edit', 'label': 'Editar'},
            {'key': 'delete', 'label': 'Deletar'},
            {'key': 'grant_admin', 'label': 'Dar/remover admin'},
            {'key': 'assign_units', 'label': 'Gerenciar unidades'},
            {'key': 'reset_password', 'label': 'Resetar senha'},
            {'key': 'hide_create_button', 'label': 'Ocultar botao Novo usuario'},
            {'key': 'hide_edit_button', 'label': 'Ocultar botao Editar'},
            {'key': 'hide_revoke_access_button', 'label': 'Ocultar botao Revogar/Liberar acesso'},
            {'key': 'hide_block_button', 'label': 'Ocultar botao Bloquear/Desbloquear'},
            {'key': 'hide_reset_password_button', 'label': 'Ocultar botao Resetar senha'},
            {'key': 'hide_delete_button', 'label': 'Ocultar botao Excluir'},
            {'key': 'hide_grant_admin_button', 'label': 'Ocultar botao Dar/Remover admin'},
        ],
    },
    {
        'key': 'units',
        'label': 'Unidades',
        'description': 'Cadastro, edicao e remocao de unidades.',
        'screen_type': 'admin',
        'screen_type_label': 'Administrador',
        'actions': [
            {'key': 'view', 'label': 'Visualizar'},
            {'key': 'create', 'label': 'Criar'},
            {'key': 'edit', 'label': 'Editar'},
            {'key': 'delete', 'label': 'Deletar'},
            {'key': 'hide_create_button', 'label': 'Ocultar botao Cadastrar unidade'},
            {'key': 'hide_upload_button', 'label': 'Ocultar botao Upload/PDFs'},
            {'key': 'hide_investors_button', 'label': 'Ocultar botao Investidores associados'},
            {'key': 'hide_edit_button', 'label': 'Ocultar botao Editar'},
            {'key': 'hide_delete_button', 'label': 'Ocultar botao Deletar'},
        ],
    },
    {
        'key': 'files',
        'label': 'Arquivos',
        'description': 'Upload, edicao, exclusao e visibilidade de arquivos.',
        'screen_type': 'admin',
        'screen_type_label': 'Administrador',
        'actions': [
            {'key': 'view', 'label': 'Visualizar'},
            {'key': 'create', 'label': 'Enviar arquivo'},
            {'key': 'edit', 'label': 'Editar'},
            {'key': 'delete', 'label': 'Deletar'},
            {'key': 'download', 'label': 'Baixar'},
            {'key': 'hide_preview_button', 'label': 'Ocultar botao Visualizar PDF'},
            {'key': 'hide_edit_button', 'label': 'Ocultar botao Editar'},
            {'key': 'hide_download_button', 'label': 'Ocultar botao Baixar PDF'},
            {'key': 'hide_delete_button', 'label': 'Ocultar botao Excluir'},
        ],
    },
    {
        'key': 'access_visibility',
        'label': 'Acessos',
        'description': 'Usuarios online, mensagem e derrubar acesso.',
        'screen_type': 'admin',
        'screen_type_label': 'Administrador',
        'actions': [
            {'key': 'view', 'label': 'Visualizar'},
            {'key': 'kick_access', 'label': 'Derrubar acesso'},
            {'key': 'send_message', 'label': 'Enviar mensagem'},
            {'key': 'hide_kick_access_button', 'label': 'Ocultar botao Derrubar acesso'},
            {'key': 'hide_send_message_button', 'label': 'Ocultar botao Mandar mensagem'},
        ],
    },
    {
        'key': 'profiles',
        'label': 'Perfis',
        'description': 'Criacao e manutencao de grupos de permissao.',
        'screen_type': 'admin',
        'screen_type_label': 'Administrador',
        'actions': [
            {'key': 'view', 'label': 'Visualizar'},
            {'key': 'create', 'label': 'Criar grupo'},
            {'key': 'edit', 'label': 'Editar grupo'},
            {'key': 'delete', 'label': 'Deletar grupo'},
            {'key': 'hide_create_button', 'label': 'Ocultar botao Novo grupo'},
            {'key': 'hide_edit_button', 'label': 'Ocultar botao Editar grupo'},
            {'key': 'hide_delete_button', 'label': 'Ocultar botao Deletar grupo'},
        ],
    },
    {
        'key': 'investor_portal',
        'label': 'Portal do investidor',
        'description': 'Tela de unidades, documentos, visualizacao e download de PDF.',
        'screen_type': 'user',
        'screen_type_label': 'Usuario / Investidor',
        'actions': [
            {'key': 'view', 'label': 'Visualizar'},
            {'key': 'view_pdf', 'label': 'Visualizar PDF'},
            {'key': 'download', 'label': 'Baixar PDF'},
            {'key': 'hide_view_pdf_button', 'label': 'Ocultar botao Visualizar PDF'},
            {'key': 'hide_download_button', 'label': 'Ocultar botao Baixar PDF'},
        ],
    },
]

DEFAULT_GROUPS = [
    {
        'slug': 'super_admin',
        'name': 'Super admin',
        'description': 'Controle total do sistema.',
        'is_system': True,
        'rules': {module['key']: {action['key']: True for action in module['actions']} for module in PERMISSION_CATALOG},
    },
    {
        'slug': 'admin',
        'name': 'Administrador',
        'description': 'Operacao administrativa sem gerenciar perfis ou super admins.',
        'is_system': True,
        'rules': {
            'home': {'view': True},
            'dashboard': {'view': True},
            'users': {'view': True, 'create': True, 'edit': True, 'assign_units': True, 'reset_password': True},
            'units': {'view': True, 'create': True, 'edit': True},
            'files': {'view': True, 'create': True, 'edit': True, 'delete': True, 'download': True},
        },
    },
    {
        'slug': 'investor',
        'name': 'Investidor',
        'description': 'Acesso ao portal do investidor e documentos liberados.',
        'is_system': True,
        'rules': {
            'dashboard': {'view': True},
            'investor_portal': {'view': True, 'view_pdf': True, 'download': True},
        },
    },
]


def slugify_name(name: str) -> str:
    slug = re.sub(r'[^a-z0-9]+', '-', name.strip().lower()).strip('-')
    return slug or 'grupo'


def parse_rules(rules_json: str | None) -> dict[str, dict[str, bool]]:
    if not rules_json:
        return {}
    try:
        parsed = json.loads(rules_json)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def serialize_rules(rules: dict[str, dict[str, bool]]) -> str:
    return json.dumps(validate_rules(rules), ensure_ascii=True, sort_keys=True)


def validate_rules(rules: dict[str, dict[str, bool]] | None) -> dict[str, dict[str, bool]]:
    if not rules:
        return {}

    allowed = {
        module['key']: {action['key'] for action in module['actions']}
        for module in PERMISSION_CATALOG
    }
    validated: dict[str, dict[str, bool]] = {}
    for module_key, actions in rules.items():
        if module_key not in allowed or not isinstance(actions, dict):
            continue
        clean_actions = {
            action_key: bool(value)
            for action_key, value in actions.items()
            if action_key in allowed[module_key]
        }
        if clean_actions:
            validated[module_key] = clean_actions
    return validated


def serialize_group(group: PermissionGroup) -> dict:
    return {
        'id': group.id,
        'name': group.name,
        'slug': group.slug,
        'description': group.description,
        'is_system': bool(group.is_system),
        'rules': parse_rules(group.rules_json),
        'created_at': group.created_at,
        'updated_at': group.updated_at,
    }


def ensure_default_permission_groups(db: Session) -> None:
    changed = False
    for default_group in DEFAULT_GROUPS:
        group = db.query(PermissionGroup).filter(PermissionGroup.slug == default_group['slug']).first()
        if group:
            current_rules = parse_rules(group.rules_json)
            default_rules = validate_rules(deepcopy(default_group['rules']))
            merged_rules = deepcopy(current_rules)
            for module_key, actions in default_rules.items():
                merged_rules.setdefault(module_key, {})
                for action_key, value in actions.items():
                    merged_rules[module_key].setdefault(action_key, value)
            if merged_rules != current_rules:
                group.rules_json = serialize_rules(merged_rules)
                changed = True
            continue
        db.add(
            PermissionGroup(
                name=default_group['name'],
                slug=default_group['slug'],
                description=default_group['description'],
                is_system=default_group['is_system'],
                rules_json=serialize_rules(deepcopy(default_group['rules'])),
            )
        )
        changed = True
    if changed:
        db.commit()


def get_rules_for_role(db: Session, role: str | None) -> dict[str, dict[str, bool]]:
    ensure_default_permission_groups(db)
    slug = (role or 'investor').strip()
    group = db.query(PermissionGroup).filter(PermissionGroup.slug == slug).first()
    if not group:
        return {}
    return validate_rules(parse_rules(group.rules_json))


def get_rules_for_user(db: Session, user) -> dict[str, dict[str, bool]]:
    ensure_default_permission_groups(db)
    group_id = getattr(user, 'permission_group_id', None)
    if group_id:
        group = db.query(PermissionGroup).filter(PermissionGroup.id == group_id).first()
        if group:
            return validate_rules(parse_rules(group.rules_json))
    return get_rules_for_role(db, getattr(user, 'role', None))


def has_user_permission(db: Session, user, module_key: str, action_key: str) -> bool:
    if getattr(user, 'role', None) == 'super_admin':
        return True
    rules = get_rules_for_user(db, user)
    return rules.get(module_key, {}).get(action_key) is True


def unique_slug(db: Session, name: str, group_id: int | None = None) -> str:
    base_slug = slugify_name(name)
    slug = base_slug
    counter = 2
    while True:
        query = db.query(PermissionGroup).filter(PermissionGroup.slug == slug)
        if group_id is not None:
            query = query.filter(PermissionGroup.id != group_id)
        if not query.first():
            return slug
        slug = f'{base_slug}-{counter}'
        counter += 1
