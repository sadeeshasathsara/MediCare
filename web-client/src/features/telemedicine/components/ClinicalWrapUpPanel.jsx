import { useState } from 'react'
import { FilePenLine, Pill, Plus, Trash2 } from 'lucide-react'

import FeatureNotice from '@/features/telemedicine/components/FeatureNotice'
import StatusBadge from '@/features/telemedicine/components/StatusBadge'
import TelemedicineSection from '@/features/telemedicine/components/TelemedicineSection'
import {
  createEmptyMedication,
  formatDate,
  formatDateTime,
  nextLocalDateTimeValue,
} from '@/features/telemedicine/services/telemedicineTypes'

function actionButtonClass(kind = 'secondary') {
  if (kind === 'primary') {
    return 'inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60'
  }

  if (kind === 'danger') {
    return 'inline-flex items-center justify-center rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-900 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100'
  }

  return 'inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/[0.05]'
}

function emptyMedicationRow() {
  return createEmptyMedication()
}

function ConsultationForm({
  session,
  consultation,
  consultationLocked,
  consultationActionState,
  onCreateConsultation,
  onUpdateConsultation,
}) {
  const [doctorNotes, setDoctorNotes] = useState(consultation?.doctorNotes || '')
  const [diagnosis, setDiagnosis] = useState(consultation?.diagnosis || '')
  const [followUpDate, setFollowUpDate] = useState(consultation?.followUpDate || '')

  const consultationSubmitDisabled =
    consultationLocked ||
    consultationActionState.loading ||
    !doctorNotes.trim() ||
    !diagnosis.trim()

  return (
    <>
      {consultation ? (
        <div className="rounded-[22px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.55)' }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Existing record
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                {consultation.id}
              </p>
            </div>
            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Follow-up: {consultation.followUpDate ? formatDate(consultation.followUpDate) : 'Not set'}
            </p>
          </div>
        </div>
      ) : null}

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()

          if (consultation) {
            onUpdateConsultation(consultation.id, {
              doctorNotes,
              diagnosis,
              followUpDate,
            })
            return
          }

          onCreateConsultation({
            sessionId: session?.id,
            doctorNotes,
            diagnosis,
            followUpDate,
          })
        }}
      >
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
            Doctor notes
          </label>
          <textarea
            value={doctorNotes}
            onChange={(event) => setDoctorNotes(event.target.value)}
            rows={5}
            placeholder="Summarize what was discussed, relevant symptoms, and any action items."
            className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
            style={{
              borderColor: 'hsl(var(--border))',
              backgroundColor: 'hsl(var(--background) / 0.6)',
              color: 'hsl(var(--foreground))',
            }}
            disabled={consultationLocked}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
            Diagnosis
          </label>
          <textarea
            value={diagnosis}
            onChange={(event) => setDiagnosis(event.target.value)}
            rows={3}
            placeholder="Example: Viral upper respiratory tract infection with mild dehydration."
            className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
            style={{
              borderColor: 'hsl(var(--border))',
              backgroundColor: 'hsl(var(--background) / 0.6)',
              color: 'hsl(var(--foreground))',
            }}
            disabled={consultationLocked}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
            Follow-up date
          </label>
          <input
            type="date"
            value={followUpDate}
            onChange={(event) => setFollowUpDate(event.target.value)}
            className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
            style={{
              borderColor: 'hsl(var(--border))',
              backgroundColor: 'hsl(var(--background) / 0.6)',
              color: 'hsl(var(--foreground))',
            }}
            disabled={consultationLocked}
          />
        </div>

        <button
          type="submit"
          disabled={consultationSubmitDisabled}
          className={actionButtonClass('primary')}
          style={{ backgroundColor: 'hsl(var(--primary))' }}
        >
          {consultationActionState.loading
            ? consultation
              ? 'Updating consultation...'
              : 'Saving consultation...'
            : consultation
              ? 'Update Consultation'
              : 'Create Consultation'}
        </button>
      </form>
    </>
  )
}

function PrescriptionComposer({ consultation, prescriptionActionState, onCreatePrescription }) {
  const [expiresAt, setExpiresAt] = useState(nextLocalDateTimeValue(7 * 24 * 60))
  const [medications, setMedications] = useState([emptyMedicationRow()])

  const prescriptionSubmitDisabled =
    !consultation ||
    prescriptionActionState.loading ||
    !expiresAt ||
    medications.some(
      (medication) =>
        !medication.name.trim() ||
        !medication.dosage.trim() ||
        !medication.frequency.trim() ||
        !String(medication.durationDays || '').trim()
    )

  const handleMedicationChange = (index, field, value) => {
    setMedications((current) =>
      current.map((medication, medicationIndex) =>
        medicationIndex === index
          ? {
              ...medication,
              [field]: field === 'durationDays' ? Number(value || 0) : value,
            }
          : medication
      )
    )
  }

  const addMedication = () => {
    setMedications((current) => [...current, emptyMedicationRow()])
  }

  const removeMedication = (index) => {
    setMedications((current) =>
      current.length === 1 ? current : current.filter((_, medicationIndex) => medicationIndex !== index)
    )
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        onCreatePrescription({
          consultationId: consultation.id,
          expiresAt,
          medications,
          prescriptionStatus: 'ISSUED',
        })
      }}
    >
      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
          Expires at
        </label>
        <input
          type="datetime-local"
          value={expiresAt}
          onChange={(event) => setExpiresAt(event.target.value)}
          className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
          style={{
            borderColor: 'hsl(var(--border))',
            backgroundColor: 'hsl(var(--background) / 0.6)',
            color: 'hsl(var(--foreground))',
          }}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
            Medications
          </p>
          <button
            type="button"
            onClick={addMedication}
            className={actionButtonClass()}
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add medication
          </button>
        </div>

        {medications.map((medication, index) => (
          <div
            key={`${index}-${consultation?.id || 'draft'}`}
            className="space-y-3 rounded-[22px] border p-4"
            style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.55)' }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={medication.name}
                onChange={(event) => handleMedicationChange(index, 'name', event.target.value)}
                placeholder="Medication name"
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
                style={{
                  borderColor: 'hsl(var(--border))',
                  backgroundColor: 'hsl(var(--card))',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <input
                type="text"
                value={medication.dosage}
                onChange={(event) => handleMedicationChange(index, 'dosage', event.target.value)}
                placeholder="Dosage"
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
                style={{
                  borderColor: 'hsl(var(--border))',
                  backgroundColor: 'hsl(var(--card))',
                  color: 'hsl(var(--foreground))',
                }}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={medication.frequency}
                onChange={(event) => handleMedicationChange(index, 'frequency', event.target.value)}
                placeholder="Frequency"
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
                style={{
                  borderColor: 'hsl(var(--border))',
                  backgroundColor: 'hsl(var(--card))',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <input
                type="number"
                min="1"
                value={medication.durationDays}
                onChange={(event) => handleMedicationChange(index, 'durationDays', event.target.value)}
                placeholder="Duration in days"
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
                style={{
                  borderColor: 'hsl(var(--border))',
                  backgroundColor: 'hsl(var(--card))',
                  color: 'hsl(var(--foreground))',
                }}
              />
            </div>

            <textarea
              value={medication.instructions}
              onChange={(event) => handleMedicationChange(index, 'instructions', event.target.value)}
              rows={2}
              placeholder="Instructions"
              className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
              style={{
                borderColor: 'hsl(var(--border))',
                backgroundColor: 'hsl(var(--card))',
                color: 'hsl(var(--foreground))',
              }}
            />

            <button
              type="button"
              onClick={() => removeMedication(index)}
              disabled={medications.length === 1}
              className={actionButtonClass('danger')}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={prescriptionSubmitDisabled}
        className={actionButtonClass('primary')}
        style={{ backgroundColor: 'hsl(var(--primary))' }}
      >
        {prescriptionActionState.loading && prescriptionActionState.kind === 'create'
          ? 'Issuing prescription...'
          : 'Issue Prescription'}
      </button>
    </form>
  )
}

export default function ClinicalWrapUpPanel({
  session,
  consultation,
  prescriptions = [],
  consultationActionState,
  prescriptionActionState,
  onCreateConsultation,
  onUpdateConsultation,
  onCreatePrescription,
  onUpdatePrescriptionStatus,
  onCancelPrescription,
}) {
  const consultationLocked = !session || session.sessionStatus !== 'COMPLETED'
  const prescriptionLocked = !consultation
  const consultationFormKey = `consultation:${consultation?.id || session?.id || 'empty'}`
  const prescriptionFormKey = `prescription:${consultation?.id || session?.id || 'empty'}`

  return (
    <TelemedicineSection
      title="Clinical Wrap-up"
      description="Document the consultation and issue the prescription right after the call while the context is still fresh."
    >
      <div className="space-y-5">
        {consultationActionState.error ? (
          <FeatureNotice tone="error" title="Consultation record failed" message={consultationActionState.error} />
        ) : null}
        {consultationActionState.success ? (
          <FeatureNotice tone="success" title="Consultation record saved" message={consultationActionState.success} />
        ) : null}
        {prescriptionActionState.error ? (
          <FeatureNotice tone="error" title="Prescription action failed" message={prescriptionActionState.error} />
        ) : null}
        {prescriptionActionState.success ? (
          <FeatureNotice tone="success" title="Prescription updated" message={prescriptionActionState.success} />
        ) : null}

        {consultationLocked ? (
          <FeatureNotice
            tone="warning"
            title="Wrap-up is locked"
            message="Consultation notes and prescriptions become available only after the session has been marked as completed."
          />
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4 rounded-[24px] border p-5" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
            <div className="flex items-center gap-2">
              <FilePenLine className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                Consultation record
              </p>
            </div>

            <ConsultationForm
              key={consultationFormKey}
              session={session}
              consultation={consultation}
              consultationLocked={consultationLocked}
              consultationActionState={consultationActionState}
              onCreateConsultation={onCreateConsultation}
              onUpdateConsultation={onUpdateConsultation}
            />
          </div>

          <div className="space-y-4 rounded-[24px] border p-5" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
            <div className="flex items-center gap-2">
              <Pill className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                Prescription desk
              </p>
            </div>

            {prescriptionLocked ? (
              <FeatureNotice
                tone="info"
                title="Create consultation first"
                message="Prescriptions are linked to a consultation record, so this section unlocks once the consultation note is saved."
              />
            ) : (
              <>
                <FeatureNotice
                  tone="info"
                  title="Default issue mode"
                  message="New prescriptions are created with status ISSUED so you can test the full backend flow immediately."
                />

                <PrescriptionComposer
                  key={prescriptionFormKey}
                  consultation={consultation}
                  prescriptionActionState={prescriptionActionState}
                  onCreatePrescription={onCreatePrescription}
                />
              </>
            )}

            <div className="space-y-3">
              <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                Existing prescriptions
              </p>

              {prescriptions.length === 0 ? (
                <FeatureNotice
                  tone="info"
                  title="No prescriptions yet"
                  message="Issue a prescription above to test the telemedicine prescription lifecycle."
                />
              ) : (
                prescriptions.map((prescription) => (
                  <div
                    key={prescription.id}
                    className="space-y-3 rounded-[22px] border p-4"
                    style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.55)' }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={prescription.prescriptionStatus} />
                          <span className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            {prescription.id}
                          </span>
                        </div>
                        <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                          {prescription.medications.length} medication{prescription.medications.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="text-right text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        <p>Issued: {formatDateTime(prescription.issuedAt)}</p>
                        <p>Expires: {formatDateTime(prescription.expiresAt)}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {prescription.medications.map((medication, medicationIndex) => (
                        <div
                          key={`${prescription.id}-${medicationIndex}`}
                          className="rounded-2xl border px-3 py-3 text-sm"
                          style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                        >
                          <p className="font-semibold">{medication.name}</p>
                          <p className="mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            {medication.dosage} - {medication.frequency} - {medication.durationDays} day(s)
                          </p>
                          {medication.instructions ? (
                            <p className="mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                              {medication.instructions}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {prescription.prescriptionStatus === 'DRAFT' ? (
                        <button
                          type="button"
                          onClick={() => onUpdatePrescriptionStatus(prescription.id, 'ISSUED')}
                          disabled={prescriptionActionState.loading}
                          className={actionButtonClass()}
                          style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                        >
                          Mark as Issued
                        </button>
                      ) : null}

                      {prescription.prescriptionStatus === 'ISSUED' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onUpdatePrescriptionStatus(prescription.id, 'DISPENSED')}
                            disabled={prescriptionActionState.loading}
                            className={actionButtonClass()}
                            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                          >
                            Mark as Dispensed
                          </button>
                          <button
                            type="button"
                            onClick={() => onCancelPrescription(prescription.id)}
                            disabled={prescriptionActionState.loading}
                            className={actionButtonClass('danger')}
                          >
                            Cancel Prescription
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </TelemedicineSection>
  )
}
