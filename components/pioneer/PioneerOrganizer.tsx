'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight, MapPin, MessageCircle, Navigation, Pause, Play, Plus, RefreshCw, Send, StickyNote, Trash2, Users, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

type Activity = Record<string, any>
type Mode = 'calendar' | 'revisits' | 'studies'

const tags = ['Jovem', 'Pai', 'Mãe', 'Casal', 'Idoso', 'Família', 'Pessoa sozinha']
const planningTypes = ['Campo', 'Carrinho', 'Cartas', 'Telefone', 'Outro']

const dateISO = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const parseDate = (value: string) => new Date(`${value}T12:00:00`)
const fmtDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(parseDate(value))
const dayOf = (value: string) => parseDate(value).getDay()
const phoneUrl = (phone: string) => {
    const digits = phone.replace(/\D/g, '')
    return `https://wa.me/${digits.length === 10 || digits.length === 11 ? `55${digits}` : digits}`
}
const distance = (a: Activity, b: Activity) => {
    if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return null
    const toRad = (value: number) => value * Math.PI / 180
    const lat = toRad(b.latitude - a.latitude)
    const lon = toRad(b.longitude - a.longitude)
    const value = Math.sin(lat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(lon / 2) ** 2
    return 2 * 6371 * Math.asin(Math.sqrt(value))
}

function sessionPin() {
    const raw = localStorage.getItem('membro_sessao')
    return raw ? JSON.parse(raw).pin as string : ''
}

function occursWeekly(activity: Activity, date: string) {
    return activity.recorrencia_semanal && activity.data_agendada <= date && dayOf(activity.data_agendada) === dayOf(date)
}

function activitiesForDate(activities: Activity[], occurrences: Activity[], date: string) {
    const result: Activity[] = []
    for (const activity of activities) {
        if (activity.status !== 'ATIVA') continue
        if (!activity.recorrencia_semanal) {
            if (activity.data_agendada === date) result.push(activity)
            continue
        }
        if (activity.tipo !== 'ESTUDO') {
            if (occursWeekly(activity, date)) result.push({ ...activity, __virtualDate: date, __displayDate: date })
            continue
        }
        const rescheduled = occurrences.find(item => item.atividade_id === activity.id && item.status === 'REMARCADO' && item.data_agendada === date)
        if (rescheduled) result.push({ ...activity, __virtualDate: date, __displayDate: date, __occurrenceOriginal: rescheduled.data_original })
        if (occursWeekly(activity, date)) {
            const occurrence = occurrences.find(item => item.atividade_id === activity.id && item.data_original === date)
            if (!occurrence) result.push({ ...activity, __virtualDate: date, __displayDate: date, __occurrenceOriginal: date })
        }
    }
    return result
}

function nextStudy(study: Activity, occurrences: Activity[]) {
    const today = dateISO()
    const candidates: { original: string; scheduled: string }[] = occurrences
        .filter(item => item.atividade_id === study.id && item.status === 'REMARCADO' && item.data_agendada >= today)
        .map(item => ({ original: item.data_original, scheduled: item.data_agendada }))
    const cursor = parseDate(study.data_agendada > today ? study.data_agendada : today)
    while (cursor.getDay() !== dayOf(study.data_agendada)) cursor.setDate(cursor.getDate() + 1)
    for (let index = 0; index < 104; index += 1) {
        const original = dateISO(cursor)
        const occurrence = occurrences.find(item => item.atividade_id === study.id && item.data_original === original)
        if (!occurrence) candidates.push({ original, scheduled: original })
        cursor.setDate(cursor.getDate() + 7)
    }
    candidates.sort((a, b) => a.scheduled.localeCompare(b.scheduled))
    return candidates[0]
}

function isOverdue(activity: Activity) {
    return activity.tipo === 'REVISITA' && activity.status === 'ATIVA' && activity.data_agendada < dateISO()
}

export default function PioneerOrganizer({ initialMode }: { initialMode: Mode }) {
    const router = useRouter()
    const [mode, setMode] = useState<Mode>(initialMode)
    const [activities, setActivities] = useState<Activity[]>([])
    const [studyOccurrences, setStudyOccurrences] = useState<Activity[]>([])
    const [invites, setInvites] = useState<Activity[]>([])
    const [transferResponses, setTransferResponses] = useState<Activity[]>([])
    const [pioneers, setPioneers] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)
    const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    const [selectedDay, setSelectedDay] = useState(dateISO())
    const [form, setForm] = useState<Activity | null>(null)
    const [transfer, setTransfer] = useState<Activity | null>(null)
    const [schedule, setSchedule] = useState<Activity | null>(null)
    const [editingStudyOccurrence, setEditingStudyOccurrence] = useState<Activity | null>(null)
    const [studyNote, setStudyNote] = useState<Activity | null>(null)
    const [studyNotes, setStudyNotes] = useState<Activity[]>([])
    const [revisitFilter, setRevisitFilter] = useState<'pending' | 'completed'>('pending')
    const [studyTab, setStudyTab] = useState<'active' | 'history' | 'ended'>('active')

    const api = async (payload: Record<string, unknown>) => {
        const response = await fetch('/api/pioneer/activities', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: sessionPin(), ...payload })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a operação')
        return data
    }

    const load = async () => {
        try {
            const data = await api({ action: 'list' })
            setActivities(data.activities || [])
            setStudyOccurrences(data.studyOccurrences || [])
            setStudyNotes(data.studyNotes || [])
            setInvites(data.invites || [])
            setTransferResponses(data.transferResponses || [])
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao carregar')
        } finally { setLoading(false) }
    }

    // A carga inicial é deliberadamente única; load depende apenas da sessão local atual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { void load() }, [])
    useEffect(() => {
        if (!transfer) return
        void api({ action: 'pioneers' }).then(data => setPioneers(data.pioneers || [])).catch(() => toast.error('Não foi possível listar pioneiros'))
    }, [transfer])

    const days = useMemo(() => {
        const first = new Date(month.getFullYear(), month.getMonth(), 1)
        const offset = first.getDay()
        const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
        return Array.from({ length: offset + count }, (_, index) => index < offset ? null : new Date(month.getFullYear(), month.getMonth(), index - offset + 1))
    }, [month])
    const selectedActivities = useMemo(() => activitiesForDate(activities, studyOccurrences, selectedDay), [activities, studyOccurrences, selectedDay])

    const save = async (activity: Activity) => {
        try {
            const clean = { ...activity }
            for (const key of ['id', 'created_at', 'updated_at', 'criado_por_id', 'responsavel_id', 'status', '__virtualDate', '__displayDate', '__occurrenceOriginal']) delete clean[key]
            if (activity.id) await api({ action: 'update', activityId: activity.id, activity: clean })
            else await api({ action: 'create', activity: clean })
            toast.success('Salvo com sucesso')
            setForm(null)
            await load()
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao salvar') }
    }
    const remove = async (activity: Activity) => {
        if (!confirm(`Excluir ${activity.tipo === 'ESTUDO' ? 'este estudo e seu histórico' : 'este registro'}?`)) return
        try { await api({ action: 'delete', activityId: activity.id }); toast.success('Registro excluído'); await load() } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao excluir') }
    }
    const setStatus = async (activity: Activity, status: 'ATIVA' | 'PAUSADA' | 'CANCELADA') => {
        try { await api({ action: 'setStatus', activityId: activity.id, status }); toast.success(status === 'PAUSADA' ? 'Estudo pausado' : status === 'CANCELADA' ? 'Estudo encerrado' : 'Estudo retomado'); await load() } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao atualizar') }
    }
    const complete = async (activity: Activity) => {
        try { await api({ action: 'complete', activityId: activity.id }); toast.success('Revisita concluída'); await load() } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao concluir') }
    }
    const recordStudy = async (study: Activity, status: 'REALIZADO' | 'PULADO' | 'REMARCADO', scheduled?: string) => {
        try {
            const next = nextStudy(study, studyOccurrences)
            await api({ action: 'studyOccurrence', activityId: study.id, occurrence: { data_original: next.original, data_agendada: scheduled || null, status } })
            toast.success(status === 'REALIZADO' ? 'Estudo marcado como realizado' : status === 'PULADO' ? 'Estudo pulado nesta semana' : 'Estudo remarcado')
            setSchedule(null)
            await load()
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao registrar estudo') }
    }
    const respond = async (invite: Activity, accept: boolean) => {
        try { await api({ action: 'respondTransfer', transferId: invite.id, accept }); toast.success(accept ? 'Revisita aceita' : 'Convite recusado'); await load() } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao responder') }
    }
    const cancelTransfer = async (activity: Activity) => {
        if (!confirm('Cancelar o convite de transferência?')) return
        try { await api({ action: 'cancelTransfer', activityId: activity.id }); toast.success('Transferência cancelada'); await load() } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao cancelar') }
    }
    const openMaps = (activity: Activity) => window.open(activity.latitude != null
        ? `https://www.google.com/maps/search/?api=1&query=${activity.latitude},${activity.longitude}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([activity.endereco, activity.numero, activity.bairro, activity.cidade].filter(Boolean).join(', '))}`, '_blank')
    const nearby = (activity: Activity) => activitiesForDate(activities, studyOccurrences, activity.__displayDate || activity.data_agendada)
        .filter(other => other.id !== activity.id).map(other => ({ other, km: distance(activity, other) })).filter(item => item.km != null && item.km <= 1)

    if (loading) return <div className="min-h-screen grid place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" /></div>

    const title = mode === 'calendar' ? 'Calendário e planejamento' : 'Estudos e revisitas'
    const subtitle = mode === 'calendar' ? 'Veja e organize sua semana.' : mode === 'studies' ? 'Organize seus estudos bíblicos.' : 'Registre e acompanhe seus retornos.'
    const createType = mode === 'calendar' ? 'PLANEJAMENTO' : mode === 'studies' ? 'ESTUDO' : 'REVISITA'

    return <main className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950"><div className="mx-auto max-w-md">
        <button onClick={() => router.push('/painel-pioneiro')} className="mb-5 inline-flex items-center gap-1 text-sm text-slate-500"><ChevronLeft className="h-4 w-4" /> Painel do Pioneiro</button>
        <div className="mb-5 flex items-start justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div><button onClick={() => setForm({ tipo: createType, data_agendada: selectedDay, textos_biblicos: [], etiquetas: [], recorrencia_semanal: createType === 'ESTUDO' })} className="rounded-2xl bg-emerald-600 p-3 text-white shadow-sm"><Plus className="h-5 w-5" /></button></div>
        {initialMode === 'revisits' && <div className="mb-5 grid grid-cols-2 rounded-2xl bg-slate-200 p-1 dark:bg-slate-800"><Tab active={mode === 'studies'} onClick={() => setMode('studies')}>Estudos</Tab><Tab active={mode === 'revisits'} onClick={() => setMode('revisits')}>Revisitas</Tab></div>}
        {transferResponses.map(response => <section key={response.id} className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><div className="flex justify-between gap-3"><p><b>{response.destinatario?.nome_civil || response.destinatario?.nome_completo || 'O pioneiro'}</b> recusou a revisita de <b>{response.atividade?.pessoa_nome || response.atividade?.titulo || 'contato'}</b>.</p><button onClick={() => void api({ action: 'ackTransferResponse', transferId: response.id }).then(load)}><X className="h-4 w-4" /></button></div></section>)}
        {invites.length > 0 && <section className="mb-4 rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/30"><div className="flex gap-2 text-violet-800 dark:text-violet-200"><Users className="h-5 w-5"/><b>Convites para revisita</b></div>{invites.map(invite => <div key={invite.id} className="mt-3 rounded-xl bg-white p-3 text-sm dark:bg-slate-900"><b>{invite.atividade?.pessoa_nome || invite.atividade?.titulo || 'Revisita'}</b><p className="text-slate-500">{fmtDate(invite.atividade?.data_agendada)}</p><div className="mt-2 flex gap-2"><button onClick={() => void respond(invite, true)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white">Aceitar</button><button onClick={() => void respond(invite, false)} className="rounded-lg border px-3 py-1.5">Recusar</button></div></div>)}</section>}
        {mode === 'calendar' ? <><Calendar month={month} selectedDay={selectedDay} days={days} hasActivity={(day: Date) => activitiesForDate(activities, studyOccurrences, dateISO(day)).length > 0} onPrevious={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} onNext={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} onSelect={(day: Date) => setSelectedDay(dateISO(day))} /><section className="mt-5"><h2 className="mb-3 font-bold text-slate-800 dark:text-white">{fmtDate(selectedDay)}</h2>{selectedActivities.length ? selectedActivities.map(activity => activity.tipo === 'ESTUDO' ? <StudyCard key={`${activity.id}-${activity.data_agendada}`} study={activity} occurrences={studyOccurrences} notes={studyNotes} calendarOnly onOpenStudy={() => router.push('/painel-pioneiro/estudos-revisitas')} onNote={(item: Activity, dataOriginal: string) => setStudyNote({ ...item, __noteDate: dataOriginal })} onEdit={() => setForm(activity)} onMaps={() => openMaps(activity)} onDone={() => void recordStudy(activity, 'REALIZADO')} onSkip={() => void recordStudy(activity, 'PULADO')} onReschedule={() => setSchedule({ ...activity, __study: true })} onPause={() => void setStatus(activity, 'PAUSADA')} onEnd={() => void setStatus(activity, 'CANCELADA')} onDelete={() => void remove(activity)} /> : <ActivityCard key={`${activity.id}-${activity.data_agendada}`} activity={activity} nearby={nearby(activity)} onEdit={() => setForm(activity)} onMaps={() => openMaps(activity)} onComplete={() => void complete(activity)} onSchedule={() => setSchedule(activity.status === 'CONCLUIDA' ? activity : { ...activity, __reschedule: true })} onTransfer={() => setTransfer(activity)} onCancelTransfer={() => void cancelTransfer(activity)} onDelete={() => void remove(activity)} />) : <Empty text="Nada planejado para este dia." action="Adicionar planejamento" onAction={() => setForm({ tipo: 'PLANEJAMENTO', data_agendada: selectedDay, textos_biblicos: [], etiquetas: [] })} />}</section></> : mode === 'revisits' ? <Revisits activities={activities} filter={revisitFilter} onFilter={setRevisitFilter} nearby={nearby} onEdit={setForm} onMaps={openMaps} onComplete={complete} onSchedule={setSchedule} onTransfer={setTransfer} onCancelTransfer={cancelTransfer} onDelete={remove} /> : <Studies activities={activities} occurrences={studyOccurrences} notes={studyNotes} tab={studyTab} onTab={setStudyTab} onEdit={setForm} onMaps={openMaps} onDone={(study: Activity) => void recordStudy(study, 'REALIZADO')} onSkip={(study: Activity) => void recordStudy(study, 'PULADO')} onSchedule={(study: Activity) => setSchedule({ ...study, __study: true })} onPause={(study: Activity) => void setStatus(study, 'PAUSADA')} onResume={(study: Activity) => void setStatus(study, 'ATIVA')} onEnd={(study: Activity) => void setStatus(study, 'CANCELADA')} onDelete={remove} onEditOccurrence={setEditingStudyOccurrence} onNote={(item: Activity, dataOriginal: string) => setStudyNote({ ...item, __noteDate: dataOriginal })} />}
        {form && (form.tipo === 'ESTUDO' ? <StudyForm initial={form} onClose={() => setForm(null)} onSave={save} /> : <ActivityForm initial={form} activities={activities} occurrences={studyOccurrences} onClose={() => setForm(null)} onSave={save} />)}
        {transfer && <TransferModal pioneers={pioneers} onClose={() => setTransfer(null)} onSend={async (recipientId: string) => { try { await api({ action: 'transfer', activityId: transfer.id, recipientId }); toast.success('Convite enviado'); setTransfer(null); await load() } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao transferir') } }} />}
        {schedule && <ScheduleModal activity={schedule} occurrences={studyOccurrences} onClose={() => setSchedule(null)} onSave={async (data: string) => { if (schedule.__study) await recordStudy(schedule, 'REMARCADO', data); else if (schedule.__reschedule) { await api({ action: 'update', activityId: schedule.id, activity: { data_agendada: data } }); toast.success('Revisita remarcada'); setSchedule(null); await load() } else { await api({ action: 'revisitAgain', activityId: schedule.id, schedule: { data_agendada: data } }); toast.success('Nova revisita criada'); setSchedule(null); await load() } }} />}
        {editingStudyOccurrence && <EditStudyOccurrenceModal occurrence={editingStudyOccurrence} study={activities.find(activity => activity.id === editingStudyOccurrence.atividade_id)} onClose={() => setEditingStudyOccurrence(null)} onSave={async (occurrence: Activity) => { try { if (occurrence.status === 'NAO_REALIZADO') { await api({ action: 'undoStudyOccurrence', activityId: occurrence.atividade_id, dataOriginal: occurrence.data_original }); toast.success('Registro desfeito; o estudo voltou a ficar pendente') } else { await api({ action: 'studyOccurrence', activityId: occurrence.atividade_id, occurrence: { data_original: occurrence.data_original, data_agendada: occurrence.status === 'REMARCADO' ? occurrence.data_agendada : null, status: occurrence.status, observacao: occurrence.observacao || null } }); toast.success('Histórico atualizado') } setEditingStudyOccurrence(null); await load() } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao atualizar histórico') } }} />}
        {studyNote && <StudyNoteModal study={studyNote} onClose={() => setStudyNote(null)} onSave={async (note: string) => { try { await api({ action: 'studyNote', activityId: studyNote.id, dataOriginal: studyNote.__noteDate, note }); toast.success('Observação salva para a próxima visita'); setStudyNote(null); await load() } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao salvar observação') } }} />}
    </div></main>
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={`rounded-xl border-b-2 py-2 text-sm font-semibold transition-colors ${active ? 'border-emerald-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500'}`}>{children}</button> }
function Empty({ text, action, onAction }: { text: string; action: string; onAction?: () => void }) { return <div className="rounded-2xl border border-dashed p-7 text-center text-sm text-slate-500">{text}{onAction && <><br/><button onClick={onAction} className="mt-2 font-bold text-emerald-600">{action}</button></>}</div> }
function Calendar({ month, selectedDay, days, hasActivity, onPrevious, onNext, onSelect }: any) { return <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-4 flex items-center justify-between"><button onClick={onPrevious}><ChevronLeft /></button><b className="capitalize">{month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</b><button onClick={onNext}><ChevronRight /></button></div><div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400">{['D','S','T','Q','Q','S','S'].map((item, index) => <span key={index}>{item}</span>)}</div><div className="mt-2 grid grid-cols-7 gap-y-2">{days.map((day: Date | null, index: number) => day ? <button key={index} onClick={() => onSelect(day)} className={`mx-auto grid h-9 w-9 place-items-center rounded-full text-sm ${selectedDay === dateISO(day) ? 'bg-emerald-600 text-white' : 'text-slate-700 dark:text-slate-200'}`}>{day.getDate()}{hasActivity(day) && <i className={`-mt-1 block h-1 w-1 rounded-full ${selectedDay === dateISO(day) ? 'bg-white' : 'bg-emerald-500'}`} />}</button> : <span key={index}/>)}</div></section> }

function Revisits({ activities, filter, onFilter, nearby, onEdit, onMaps, onComplete, onSchedule, onTransfer, onCancelTransfer, onDelete }: any) { const list = activities.filter((activity: Activity) => activity.tipo === 'REVISITA' && (filter === 'completed' ? activity.status === 'CONCLUIDA' : ['ATIVA', 'AGUARDANDO_TRANSFERENCIA'].includes(activity.status))).sort((a: Activity, b: Activity) => `${isOverdue(a) ? '0' : '1'}${a.data_agendada}`.localeCompare(`${isOverdue(b) ? '0' : '1'}${b.data_agendada}`)); return <section><div className="mb-3 grid grid-cols-2 rounded-2xl bg-slate-200 p-1 dark:bg-slate-800"><Tab active={filter === 'pending'} onClick={() => onFilter('pending')}>Pendentes</Tab><Tab active={filter === 'completed'} onClick={() => onFilter('completed')}>Concluídas</Tab></div><div className="space-y-3">{list.map((activity: Activity) => <ActivityCard key={activity.id} activity={activity} nearby={nearby(activity)} onEdit={() => onEdit(activity)} onMaps={() => onMaps(activity)} onComplete={() => onComplete(activity)} onSchedule={() => onSchedule(activity.status === 'CONCLUIDA' ? activity : { ...activity, __reschedule: true })} onTransfer={() => onTransfer(activity)} onCancelTransfer={() => onCancelTransfer(activity)} onDelete={() => onDelete(activity)} />)}{!list.length && <Empty text={filter === 'pending' ? 'Nenhuma revisita pendente.' : 'Nenhuma revisita concluída.'} action="" />}</div></section> }

function Studies({ activities, occurrences, notes, tab, onTab, onEdit, onMaps, onDone, onSkip, onSchedule, onPause, onResume, onEnd, onDelete, onEditOccurrence, onNote }: any) { const active = activities.filter((activity: Activity) => activity.tipo === 'ESTUDO' && ['ATIVA', 'PAUSADA'].includes(activity.status)); const ended = activities.filter((activity: Activity) => activity.tipo === 'ESTUDO' && activity.status === 'CANCELADA'); const names = new Map<string, string>(activities.filter((activity: Activity) => activity.tipo === 'ESTUDO').map((activity: Activity) => [String(activity.id), String(activity.pessoa_nome || 'Estudo')] as [string, string])); return <section><div className="mb-3 grid grid-cols-3 rounded-2xl bg-slate-200 p-1 dark:bg-slate-800"><Tab active={tab === 'active'} onClick={() => onTab('active')}>Ativos</Tab><Tab active={tab === 'history'} onClick={() => onTab('history')}>Histórico</Tab><Tab active={tab === 'ended'} onClick={() => onTab('ended')}>Encerrados</Tab></div>{tab === 'history' ? <div className="space-y-3">{occurrences.slice().sort((a: Activity, b: Activity) => b.created_at.localeCompare(a.created_at)).map((item: Activity) => <button type="button" key={item.id} onClick={() => onEditOccurrence(item)} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900"><b className="text-slate-900 dark:text-white">{names.get(String(item.atividade_id)) || 'Estudo'}</b><p className="mt-1 text-sm text-slate-500">{item.status === 'REALIZADO' ? 'Realizado' : item.status === 'PULADO' ? 'Pulado' : `Remarcado para ${fmtDate(item.data_agendada)}`} • {fmtDate(item.data_original)}</p><p className="mt-2 text-xs font-semibold text-emerald-600">Toque para editar</p></button>)}{!occurrences.length && <Empty text="Nenhuma ocorrência registrada ainda." action="" />}</div> : <div className="space-y-3">{(tab === 'active' ? active : ended).map((study: Activity) => <StudyCard key={study.id} study={study} occurrences={occurrences} notes={notes} onNote={onNote} onEdit={() => onEdit(study)} onMaps={() => onMaps(study)} onDone={() => onDone(study)} onSkip={() => onSkip(study)} onReschedule={() => onSchedule(study)} onPause={() => onPause(study)} onResume={() => onResume(study)} onEnd={() => onEnd(study)} onDelete={() => onDelete(study)} />)}{!(tab === 'active' ? active : ended).length && <Empty text={tab === 'active' ? 'Nenhum estudo ativo.' : 'Nenhum estudo encerrado.'} action="" />}</div>}</section> }

function ActivityCard({ activity, nearby, onEdit, onMaps, onComplete, onSchedule, onTransfer, onCancelTransfer, onDelete }: any) { const revisit = activity.tipo === 'REVISITA'; return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-600">{revisit ? 'Revisita' : activity.titulo || 'Planejamento'}</p><h3 className="font-bold text-slate-900 dark:text-white">{activity.pessoa_nome || activity.titulo || 'Atividade'}</h3><p className="mt-1 text-sm text-slate-500">{fmtDate(activity.__displayDate || activity.data_agendada)} {activity.hora_agendada ? `• ${String(activity.hora_agendada).slice(0, 5)}` : ''} {activity.tipo_agendamento ? `• ${activity.tipo_agendamento === 'COMBINADO' ? 'Combinado' : 'Planejado'}` : ''}</p></div>{activity.status === 'CONCLUIDA' ? <Badge color="emerald">Concluída</Badge> : activity.status === 'AGUARDANDO_TRANSFERENCIA' ? <Badge color="violet">Aguardando resposta</Badge> : isOverdue(activity) ? <Badge color="rose">Atrasada</Badge> : null}</div>{activity.observacoes && <p className="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{activity.observacoes}</p>}{nearby.map((item: any) => <p key={item.other.id} className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Há outra atividade a {Math.round(item.km * 1000)} m neste dia: {item.other.pessoa_nome || item.other.titulo}.</p>)}<div className="mt-3 flex flex-wrap gap-2"><SmallButton onClick={onEdit}>Ver / editar</SmallButton>{(activity.latitude != null || activity.endereco) && <SmallButton onClick={onMaps}><MapPin className="mr-1 inline h-4 w-4"/>Mapa</SmallButton>}{activity.telefone && <a href={phoneUrl(activity.telefone)} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-200"><MessageCircle className="mr-1 inline h-4 w-4"/>WhatsApp</a>}{revisit && activity.status === 'ATIVA' && <><SmallButton onClick={onComplete}><Check className="mr-1 inline h-4 w-4"/>Concluir</SmallButton>{isOverdue(activity) && <SmallButton onClick={onSchedule}>Remarcar</SmallButton>}<SmallButton onClick={onTransfer}><Send className="mr-1 inline h-4 w-4"/>Passar</SmallButton></>}{revisit && activity.status === 'AGUARDANDO_TRANSFERENCIA' && <SmallButton onClick={onCancelTransfer}>Cancelar transferência</SmallButton>}{revisit && activity.status === 'CONCLUIDA' && <SmallButton onClick={onSchedule}><RefreshCw className="mr-1 inline h-4 w-4"/>Revisitar de novo</SmallButton>}<SmallButton onClick={onDelete}><Trash2 className="h-4 w-4"/></SmallButton></div></article> }

function StudyCard({ study, occurrences, notes = [], calendarOnly = false, onOpenStudy, onNote, onEdit, onMaps, onDone, onSkip, onReschedule, onPause, onResume, onEnd, onDelete }: any) {
    const next = study.status === 'ATIVA' ? nextStudy(study, occurrences) : null
    const noteDate = study.__occurrenceOriginal || next?.original
    const lastNote = noteDate ? notes.find((item: Activity) => item.atividade_id === study.id && item.detalhes?.data_original < noteDate && occurrences.some((occurrence: Activity) => occurrence.atividade_id === study.id && occurrence.data_original === item.detalhes?.data_original && occurrence.status === 'REALIZADO')) : null
    if (calendarOnly) return <article className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm dark:border-blue-900 dark:bg-slate-900"><p className="text-xs font-bold uppercase tracking-wide text-blue-600">Estudo desta semana</p><h3 className="mt-1 font-bold text-slate-900 dark:text-white">{study.pessoa_nome}</h3>{lastNote?.detalhes?.nota && <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><b className="block text-xs uppercase tracking-wide">Anotação da última visita</b><p className="mt-1">{lastNote.detalhes.nota}</p></div>}<div className="mt-3 flex flex-wrap gap-2"><SmallButton onClick={onOpenStudy}>Editar estudo semanal</SmallButton><SmallButton onClick={() => onNote(study, noteDate)}><StickyNote className="mr-1 inline h-4 w-4"/>Obs. de hoje</SmallButton><SmallButton onClick={onDone}><Check className="mr-1 inline h-4 w-4"/>Realizado</SmallButton><SmallButton onClick={onSkip}>Pular</SmallButton><SmallButton onClick={onReschedule}>Remarcar</SmallButton></div></article>
    const permanentActions = <div className="mt-3 flex flex-wrap gap-2"><SmallButton onClick={onEdit}>Ver / editar</SmallButton>{(study.latitude != null || study.endereco) && <SmallButton onClick={onMaps}><MapPin className="mr-1 inline h-4 w-4"/>Mapa</SmallButton>}{study.telefone && <a href={phoneUrl(study.telefone)} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-200"><MessageCircle className="mr-1 inline h-4 w-4"/>WhatsApp</a>}{study.status === 'ATIVA' && <><SmallButton onClick={onPause}><Pause className="mr-1 inline h-4 w-4"/>Pausar</SmallButton><SmallButton onClick={onEnd}>Encerrar</SmallButton></>}{study.status === 'PAUSADA' && <><SmallButton onClick={onResume}><Play className="mr-1 inline h-4 w-4"/>Retomar</SmallButton><SmallButton onClick={onEnd}>Encerrar</SmallButton></>}<SmallButton onClick={onDelete}><Trash2 className="h-4 w-4"/></SmallButton></div>
    return <article className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm dark:border-blue-900 dark:bg-slate-900"><div className="flex justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wide text-blue-600">Estudo semanal</p><h3 className="font-bold text-slate-900 dark:text-white">{study.pessoa_nome}</h3></div><Badge color={study.status === 'PAUSADA' ? 'amber' : study.status === 'CANCELADA' ? 'slate' : 'blue'}>{study.status === 'PAUSADA' ? 'Pausado' : study.status === 'CANCELADA' ? 'Encerrado' : 'Toda semana'}</Badge></div>{study.observacoes && <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300"><b className="block text-xs uppercase tracking-wide text-slate-500">Observação do estudante</b><p className="mt-1">{study.observacoes}</p></div>}{permanentActions}{next && <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700"><p className="text-xs font-bold uppercase tracking-wide text-blue-600">Próximo estudo</p><p className="mt-1 font-semibold text-slate-900 dark:text-white">{fmtDate(next.scheduled)} {study.hora_agendada ? `• ${String(study.hora_agendada).slice(0, 5)}` : ''}</p>{lastNote?.detalhes?.nota && <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><b className="block text-xs uppercase tracking-wide">Anotação da última visita</b><p className="mt-1">{lastNote.detalhes.nota}</p></div>}<div className="mt-3 flex flex-wrap gap-2"><SmallButton onClick={() => onNote(study, noteDate)}><StickyNote className="mr-1 inline h-4 w-4"/>Obs. de hoje</SmallButton><SmallButton onClick={onDone}><Check className="mr-1 inline h-4 w-4"/>Realizado</SmallButton><SmallButton onClick={onSkip}>Pular</SmallButton><SmallButton onClick={onReschedule}>Remarcar</SmallButton></div></div>}</article>
}

function Badge({ color, children }: any) { const colors: Record<string, string> = { emerald: 'bg-emerald-100 text-emerald-700', rose: 'bg-rose-100 text-rose-700', violet: 'bg-violet-100 text-violet-700', amber: 'bg-amber-100 text-amber-700', blue: 'bg-blue-50 text-blue-700', slate: 'bg-slate-100 text-slate-700' }; return <span className={`h-fit rounded-full px-2 py-1 text-xs font-bold ${colors[color]}`}>{children}</span> }
function SmallButton({ children, onClick }: any) { return <button onClick={onClick} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">{children}</button> }

function ActivityForm({ initial, activities, occurrences, onClose, onSave }: any) { const [value, setValue] = useState<Activity>({ ...initial, textos_biblicos: initial.textos_biblicos || [], etiquetas: initial.etiquetas || [] }); const revisit = value.tipo === 'REVISITA'; const set = (key: string, next: any) => setValue((current: Activity) => ({ ...current, [key]: next })); const geo = () => navigator.geolocation?.getCurrentPosition(position => { set('latitude', position.coords.latitude); set('longitude', position.coords.longitude); toast.success('Localização salva') }, () => toast.error('Não foi possível obter sua localização')); const near = activitiesForDate(activities, occurrences, value.data_agendada || dateISO()).filter((activity: Activity) => activity.id !== value.id).map((activity: Activity) => ({ activity, km: distance(value, activity) })).filter((item: any) => item.km != null && item.km <= 1); return <Modal title={revisit ? (value.id ? 'Editar revisita' : 'Nova revisita') : (value.id ? 'Editar planejamento' : 'Novo planejamento')} onClose={onClose}><form onSubmit={event => { event.preventDefault(); void onSave(value) }}>{revisit ? <><Label text="Nome da pessoa"><input required value={value.pessoa_nome || ''} onChange={event => set('pessoa_nome', event.target.value)} /></Label><Label text="Telefone / WhatsApp"><input type="tel" value={value.telefone || ''} onChange={event => set('telefone', event.target.value)} /></Label><Label text="O que foi conversado"><textarea value={value.observacoes || ''} onChange={event => set('observacoes', event.target.value)} /></Label><Label text="Publicação deixada"><input value={value.publicacao || ''} onChange={event => set('publicacao', event.target.value)} /></Label><TextReferences value={value.textos_biblicos} onChange={(items: string[]) => set('textos_biblicos', items)} /><Label text="Pergunta para a próxima visita"><input value={value.pergunta_proxima_visita || ''} onChange={event => set('pergunta_proxima_visita', event.target.value)} /></Label><div className="mb-3"><p className="mb-1 text-sm font-semibold">Características</p><div className="flex flex-wrap gap-2">{tags.map(tag => <button type="button" key={tag} onClick={() => set('etiquetas', value.etiquetas.includes(tag) ? value.etiquetas.filter((item: string) => item !== tag) : [...value.etiquetas, tag])} className={`rounded-full border px-3 py-1 text-sm ${value.etiquetas.includes(tag) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : ''}`}>{tag}</button>)}</div></div></> : <><Label text="Tipo"><select value={value.titulo || 'Campo'} onChange={event => set('titulo', event.target.value)}>{planningTypes.map(item => <option key={item}>{item}</option>)}</select></Label><Label text="Descrição opcional"><input value={value.observacoes || ''} onChange={event => set('observacoes', event.target.value)} /></Label><Label text="Repetir"><select value={value.recorrencia_semanal ? 'weekly' : 'once'} onChange={event => set('recorrencia_semanal', event.target.value === 'weekly')}><option value="once">Só esta vez</option><option value="weekly">Toda semana</option></select></Label></>}<div className="grid grid-cols-2 gap-3"><Label text="Data"><input required type="date" value={value.data_agendada || ''} onChange={event => set('data_agendada', event.target.value)} /></Label><Label text="Hora (opcional)"><input type="time" value={value.hora_agendada || ''} onChange={event => set('hora_agendada', event.target.value)} /></Label></div>{revisit && <Label text="Esta data/hora foi"><select value={value.tipo_agendamento || 'PLANEJADO'} onChange={event => set('tipo_agendamento', event.target.value)}><option value="COMBINADO">Combinada com o morador</option><option value="PLANEJADO">Planejada por conveniência</option></select></Label>}<LocationFields value={value} set={set} geo={geo} />{near.length > 0 && <div className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{near.map((item: any) => <p key={item.activity.id}>No mesmo dia há {item.activity.pessoa_nome || item.activity.titulo} a cerca de {Math.round(item.km * 1000)} m.</p>)}</div>}<Submit /></form></Modal> }

function StudyForm({ initial, onClose, onSave }: any) { const [value, setValue] = useState<Activity>({ ...initial, recorrencia_semanal: true }); const set = (key: string, next: any) => setValue((current: Activity) => ({ ...current, [key]: next })); const geo = () => navigator.geolocation?.getCurrentPosition(position => { set('latitude', position.coords.latitude); set('longitude', position.coords.longitude); toast.success('Localização salva') }, () => toast.error('Não foi possível obter sua localização')); return <Modal title="Estudo bíblico" subtitle="O estudo será repetido toda semana." onClose={onClose}><form onSubmit={event => { event.preventDefault(); void onSave({ ...value, recorrencia_semanal: true, tipo_agendamento: null }) }}><Label text="Nome da pessoa ou família"><input required value={value.pessoa_nome || ''} onChange={event => set('pessoa_nome', event.target.value)} /></Label><Label text="Telefone / WhatsApp"><input type="tel" value={value.telefone || ''} onChange={event => set('telefone', event.target.value)} /></Label><div className="grid grid-cols-2 gap-3"><Label text="Data de início"><input required type="date" value={value.data_agendada || ''} onChange={event => set('data_agendada', event.target.value)} /></Label><Label text="Horário"><input type="time" value={value.hora_agendada || ''} onChange={event => set('hora_agendada', event.target.value)} /></Label></div><Label text="Observação inicial"><textarea value={value.observacoes || ''} onChange={event => set('observacoes', event.target.value)} /></Label><LocationFields value={value} set={set} geo={geo} /><Submit text="Salvar estudo semanal" /></form></Modal> }

function EditStudyOccurrenceModal({ occurrence, study, onClose, onSave }: any) { const [value, setValue] = useState<Activity>({ ...occurrence }); const setStatus = (status: string) => setValue((current: Activity) => ({ ...current, status, data_agendada: status === 'REMARCADO' ? current.data_agendada || current.data_original : current.data_agendada })); const undo = value.status === 'NAO_REALIZADO'; return <Modal title="Editar histórico" subtitle={study?.pessoa_nome || 'Estudo bíblico'} onClose={onClose}><form onSubmit={event => { event.preventDefault(); void onSave(value) }}><Label text="Data da ocorrência"><input disabled value={fmtDate(value.data_original)} /></Label><Label text="Resultado"><select value={value.status} onChange={event => setStatus(event.target.value)}><option value="REALIZADO">Realizado</option><option value="PULADO">Pulado</option><option value="REMARCADO">Remarcado</option><option value="NAO_REALIZADO">Não realizado (desfazer registro)</option></select></Label>{undo ? <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Ao salvar, este registro será removido do histórico e o estudo voltará a ficar pendente nesta data.</p> : <>{value.status === 'REMARCADO' && <Label text="Nova data"><input required type="date" value={value.data_agendada || ''} onChange={event => setValue((current: Activity) => ({ ...current, data_agendada: event.target.value }))} /></Label>}<Label text="Observação"><textarea value={value.observacao || ''} onChange={event => setValue((current: Activity) => ({ ...current, observacao: event.target.value }))} /></Label></>}<div className="flex gap-2"><SmallButton onClick={onClose}>Cancelar</SmallButton><button className="flex-1 rounded-xl bg-emerald-600 py-2 font-bold text-white">{undo ? 'Desfazer registro' : 'Salvar alterações'}</button></div></form></Modal> }

function StudyNoteModal({ study, onClose, onSave }: any) { const [note, setNote] = useState(''); return <Modal title="Observação do estudo" subtitle={`${study.pessoa_nome || 'Estudo'} • será exibida na próxima visita`} onClose={onClose}><form onSubmit={event => { event.preventDefault(); void onSave(note) }}><Label text="O que lembrar na próxima visita"><textarea autoFocus required value={note} placeholder="Ex.: Preciso pesquisar sobre um assunto para o próximo estudo." onChange={event => setNote(event.target.value)} /></Label><div className="flex gap-2"><SmallButton onClick={onClose}>Cancelar</SmallButton><button className="flex-1 rounded-xl bg-emerald-600 py-2 font-bold text-white">Salvar observação</button></div></form></Modal> }

function Modal({ title, subtitle, onClose, children }: any) { return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4"><div className="mx-auto my-4 max-w-md rounded-3xl bg-white p-5 shadow-xl dark:bg-slate-900"><div className="mb-4 flex justify-between gap-3"><div><h2 className="text-xl font-bold">{title}</h2>{subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}</div><button onClick={onClose}><X /></button></div>{children}</div></div> }
function Label({ text, children }: any) { return <label className="mb-3 block text-sm font-semibold">{text}<div className="mt-1 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-slate-300 [&_input]:bg-transparent [&_input]:p-2 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-slate-300 [&_select]:bg-white [&_select]:p-2 [&_select]:text-slate-900 dark:[&_input]:border-slate-600 dark:[&_select]:border-slate-600 dark:[&_select]:bg-slate-800 dark:[&_select]:text-white [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-slate-300 [&_textarea]:bg-transparent [&_textarea]:p-2">{children}</div></label> }
function TextReferences({ value, onChange }: any) { return <div className="mb-3"><p className="mb-1 text-sm font-semibold">Textos bíblicos lidos</p>{value.map((item: string, index: number) => <div className="mb-2 flex gap-2" key={index}><input className="w-full rounded-xl border border-slate-300 p-2" value={item} placeholder="Ex.: João 3:16" onChange={event => onChange(value.map((entry: string, i: number) => i === index ? event.target.value : entry))}/><button type="button" onClick={() => onChange(value.filter((_: string, i: number) => i !== index))}><X className="h-4 w-4"/></button></div>)}<button type="button" onClick={() => onChange([...value, ''])} className="text-sm font-bold text-emerald-600">+ Adicionar texto</button></div> }
function LocationFields({ value, set, geo }: any) { return <div className="mb-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800"><div className="mb-2 flex justify-between"><b className="text-sm">Local</b><button type="button" onClick={geo} className="text-sm font-bold text-emerald-600"><Navigation className="mr-1 inline h-4 w-4"/>Usar minha localização</button></div><Label text="Endereço"><input value={value.endereco || ''} onChange={event => set('endereco', event.target.value)} /></Label><div className="grid grid-cols-2 gap-3"><Label text="Número"><input value={value.numero || ''} onChange={event => set('numero', event.target.value)} /></Label><Label text="Bairro"><input value={value.bairro || ''} onChange={event => set('bairro', event.target.value)} /></Label></div><Label text="Cidade"><input value={value.cidade || ''} onChange={event => set('cidade', event.target.value)} /></Label><Label text="Complemento / referência"><input value={value.referencia || ''} onChange={event => set('referencia', event.target.value)} /></Label></div> }
function Submit({ text = 'Salvar' }: { text?: string }) { return <button className="mt-2 w-full rounded-xl bg-emerald-600 py-3 font-bold text-white">{text}</button> }
function TransferModal({ pioneers, onClose, onSend }: any) { const [id, setId] = useState(''); return <Modal title="Passar revisita" subtitle="A pessoa poderá aceitar ou recusar o convite." onClose={onClose}><select className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white" value={id} onChange={event => setId(event.target.value)}><option value="">Escolha um pioneiro</option>{pioneers.map((pioneer: Activity) => <option value={pioneer.id} key={pioneer.id}>{pioneer.nome_civil || pioneer.nome_completo}</option>)}</select><div className="mt-4 flex gap-2"><SmallButton onClick={onClose}>Cancelar</SmallButton><button disabled={!id} onClick={() => onSend(id)} className="flex-1 rounded-xl bg-emerald-600 py-2 font-bold text-white disabled:opacity-50">Enviar</button></div></Modal> }
function ScheduleModal({ activity, occurrences, onClose, onSave }: any) { const study = activity.__study; const reschedule = activity.__reschedule; const [data, setData] = useState(study ? nextStudy(activity, occurrences).scheduled : dateISO()); const title = study ? 'Remarcar estudo' : reschedule ? 'Remarcar revisita' : 'Revisitar de novo'; const text = study ? 'Apenas esta ocorrência será remarcada; as próximas seguem no dia semanal.' : reschedule ? 'A data desta revisita será alterada.' : `As informações de ${activity.pessoa_nome} serão aproveitadas na nova revisita.`; return <Modal title={title} subtitle={text} onClose={onClose}><Label text="Nova data"><input type="date" value={data} onChange={event => setData(event.target.value)} /></Label><div className="flex gap-2"><SmallButton onClick={onClose}>Cancelar</SmallButton><button onClick={() => onSave(data)} className="flex-1 rounded-xl bg-emerald-600 py-2 font-bold text-white">{study || reschedule ? 'Remarcar' : 'Criar revisita'}</button></div></Modal> }
