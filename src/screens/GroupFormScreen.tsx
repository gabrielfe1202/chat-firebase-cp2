import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { ErrorMessage } from '../components/ErrorMessage';
import { FormInput } from '../components/FormInput';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { PolicySelector } from '../components/PolicySelector';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroup';
import { useUsers } from '../hooks/useUsers';
import { addMember, createGroup, removeMember, updateGroupSettings } from '../services/groupService';
import { pickImage, uploadImage } from '../services/imageService';
import { colors } from '../theme';
import type { GroupSettingsUpdate } from '../types/group';
import type { RootScreenProps } from '../types/navigation';
import type { NotificationPolicy } from '../types/notification';
import type { PublicProfile } from '../types/user';
import { getErrorMessage } from '../utils/authErrors';
import { pluralize } from '../utils/format';
import {
  MAX_MEMBER_LIMIT,
  validateGroupCreation,
  validateGroupName,
  validateMemberLimit,
} from '../utils/groupValidation';

const DEFAULT_LIMIT = '5';
const UNKNOWN_USER = 'Usuário';

export function GroupFormScreen({ navigation, route }: RootScreenProps<'GroupForm'>) {
  const { groupId, selectedMemberIds } = route.params;
  const isEdit = groupId !== undefined;

  const { profile } = useAuth();
  const myUid = profile?.uid ?? '';
  const { byUid } = useUsers();
  const { group, loading: groupLoading, error: groupError } = useGroup(groupId);

  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [limitText, setLimitText] = useState(DEFAULT_LIMIT);
  const [policy, setPolicy] = useState<NotificationPolicy>('all_group_messages');
  const [draftMemberIds, setDraftMemberIds] = useState<string[]>([]); // criação: integrantes além do dono
  const [initialized, setInitialized] = useState(!isEdit);
  const [submitted, setSubmitted] = useState(false);
  const [working, setWorking] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const processedSelection = useRef<string[] | undefined>(undefined);

  // Edição: preenche o formulário uma única vez, quando o grupo chega do Firestore.
  useEffect(() => {
    if (!group || initialized) return;
    setName(group.name);
    setLimitText(String(group.memberLimit));
    setPolicy(group.notificationPolicy);
    setInitialized(true);
  }, [group, initialized]);

  // Seleção devolvida pela tela de usuários: na criação vira rascunho; na edição adiciona integrantes.
  useEffect(() => {
    if (!selectedMemberIds || processedSelection.current === selectedMemberIds) return;

    if (!isEdit) {
      processedSelection.current = selectedMemberIds;
      setDraftMemberIds(selectedMemberIds.filter((uid) => uid !== myUid));
      return;
    }
    if (!group) return; // espera o grupo carregar antes de processar

    processedSelection.current = selectedMemberIds;
    navigation.setParams({ selectedMemberIds: undefined });
    const newIds = selectedMemberIds.filter((uid) => !group.memberIds.includes(uid));
    if (newIds.length === 0) return;

    void (async () => {
      setWorking(true);
      setFormError(null);
      try {
        // Uma transação por integrante: cada uma revalida o limite com o estado atual do grupo.
        for (const uid of newIds) await addMember(group.id, uid, myUid);
      } catch (e) {
        setFormError(getErrorMessage(e));
      } finally {
        setWorking(false);
      }
    })();
  }, [selectedMemberIds, isEdit, group, myUid, navigation]);

  const limit = useMemo(() => (limitText.trim() === '' ? Number.NaN : Number(limitText)), [limitText]);
  const memberIds = useMemo<string[]>(
    () => (isEdit ? (group?.memberIds ?? []) : [myUid, ...draftMemberIds]),
    [isEdit, group, myUid, draftMemberIds],
  );
  const ownerId = isEdit ? (group?.ownerId ?? '') : myUid;

  const nameCheck = useMemo(() => validateGroupName(name), [name]);
  const limitCheck = useMemo(() => validateMemberLimit(limit, memberIds.length), [limit, memberIds.length]);

  // Vagas conforme o limite já salvo (edição) ou o digitado (criação).
  const effectiveLimit = isEdit ? (group?.memberLimit ?? 0) : limit;
  const freeSlots = Number.isInteger(effectiveLimit) ? Math.max(0, effectiveLimit - memberIds.length) : 0;

  const members = useMemo<PublicProfile[]>(
    () => memberIds.map((uid) => byUid.get(uid) ?? { uid, name: UNKNOWN_USER, photoUrl: '' }),
    [memberIds, byUid],
  );

  const handlePickPhoto = useCallback(async () => {
    try {
      const uri = await pickImage();
      if (uri) setPhotoUri(uri);
    } catch (e) {
      setFormError(getErrorMessage(e));
    }
  }, []);

  const handleAddMembers = useCallback(() => {
    if (isEdit) {
      navigation.navigate('Users', {
        mode: 'selectMembers',
        groupId,
        lockedIds: memberIds,
        maxSelectable: freeSlots,
      });
      return;
    }
    navigation.navigate('Users', {
      mode: 'selectMembers',
      initialSelectedIds: draftMemberIds,
      maxSelectable: Number.isInteger(limit) && limit >= 2 ? limit - 1 : undefined,
    });
  }, [draftMemberIds, freeSlots, groupId, isEdit, limit, memberIds, navigation]);

  const handleRemove = useCallback(
    (member: PublicProfile) => {
      if (!isEdit) {
        setDraftMemberIds((current) => current.filter((uid) => uid !== member.uid));
        return;
      }
      Alert.alert('Remover integrante', `Remover ${member.name || UNKNOWN_USER} do grupo?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            setWorking(true);
            setFormError(null);
            removeMember(groupId, member.uid, myUid)
              .catch((e: unknown) => setFormError(getErrorMessage(e)))
              .finally(() => setWorking(false));
          },
        },
      ]);
    },
    [groupId, isEdit, myUid],
  );

  const handleSave = useCallback(async () => {
    setSubmitted(true);
    setFormError(null);

    if (!nameCheck.ok) return setFormError(nameCheck.message);
    if (!limitCheck.ok) return setFormError(limitCheck.message);

    setWorking(true);
    try {
      if (!isEdit) {
        const validation = validateGroupCreation({ name, ownerId: myUid, memberIds, memberLimit: limit });
        if (!validation.ok) return setFormError(validation.message);

        const created = await createGroup(myUid, {
          name,
          photoUri,
          memberIds: draftMemberIds,
          memberLimit: limit,
          notificationPolicy: policy,
        });
        navigation.replace('Chat', { conversationId: created.id, conversationType: 'group' });
        return;
      }

      if (!group) return;
      const changes: GroupSettingsUpdate = {};
      if (name.trim() !== group.name) changes.name = name;
      if (limit !== group.memberLimit) changes.memberLimit = limit;
      if (policy !== group.notificationPolicy) changes.notificationPolicy = policy;
      if (photoUri) changes.photoUrl = await uploadImage(photoUri, 'groups');

      if (Object.keys(changes).length > 0) await updateGroupSettings(group.id, myUid, changes);
      navigation.goBack();
    } catch (e) {
      setFormError(getErrorMessage(e));
    } finally {
      setWorking(false);
    }
  }, [draftMemberIds, group, isEdit, limit, limitCheck, memberIds, myUid, name, nameCheck, navigation, photoUri, policy]);

  if (isEdit && (groupLoading || !initialized) && !groupError) return <Loading message="Carregando grupo..." />;

  if (isEdit && (groupError || !group)) {
    return (
      <View style={styles.center}>
        <ErrorMessage message={groupError ?? 'Grupo não encontrado.'} />
      </View>
    );
  }

  if (isEdit && group && group.ownerId !== myUid) {
    return (
      <View style={styles.center}>
        <ErrorMessage message="Apenas o proprietário do grupo pode editá-lo." />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.photo} onPress={handlePickPhoto} disabled={working} accessibilityRole="button">
          <Avatar uri={photoUri ?? group?.photoUrl} name={name} size={96} />
          <Text style={styles.link}>{photoUri || group?.photoUrl ? 'Trocar foto do grupo' : 'Escolher foto do grupo'}</Text>
        </Pressable>

        <FormInput
          label="Nome do grupo"
          value={name}
          onChangeText={setName}
          maxLength={40}
          editable={!working}
          error={submitted && !nameCheck.ok ? nameCheck.message : null}
        />
        <FormInput
          label={`Limite de integrantes (2 a ${MAX_MEMBER_LIMIT}, incluindo você)`}
          value={limitText}
          onChangeText={setLimitText}
          keyboardType="number-pad"
          editable={!working}
          error={!limitCheck.ok && (submitted || limitText !== DEFAULT_LIMIT) ? limitCheck.message : null}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Integrantes: {memberIds.length}
            {Number.isInteger(effectiveLimit) ? ` de ${effectiveLimit}` : ''}
          </Text>
          <Text style={styles.muted}>
            {freeSlots === 0 ? 'Sem vagas disponíveis.' : pluralize(freeSlots, 'vaga disponível', 'vagas disponíveis') + '.'}
          </Text>
          {members.map((member) => (
            <GroupMemberItem
              key={member.uid}
              member={member}
              isOwner={member.uid === ownerId}
              isMe={member.uid === myUid}
              onRemove={member.uid === ownerId ? undefined : handleRemove}
              disabled={working}
            />
          ))}
          <PrimaryButton
            title="Adicionar integrantes"
            variant="link"
            onPress={handleAddMembers}
            disabled={working || (isEdit && freeSlots === 0)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificações push</Text>
          <PolicySelector value={policy} onChange={setPolicy} disabled={working} />
        </View>

        <ErrorMessage message={formError} />
        <PrimaryButton title={isEdit ? 'Salvar alterações' : 'Criar grupo'} onPress={handleSave} loading={working} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  photo: { alignItems: 'center', gap: 8 },
  link: { color: colors.primary, fontWeight: '600' },
  section: { gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  muted: { color: colors.textMuted },
});
