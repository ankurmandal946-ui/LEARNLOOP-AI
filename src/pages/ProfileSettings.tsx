import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  LogOut,
  Moon,
  RotateCcw,
  Save,
  Sun,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { useLearner } from '../context/LearnerContext';
import {
  ACCOUNT_ROLES,
  EDUCATION_LEVELS_BY_CATEGORY,
  INSTITUTION_TYPES,
  SUPPORTED_LANGUAGES,
} from '../data/academicCatalog';
import { EducationCategory, PersonaType, SkillTier, UniversalUserProfile } from '../types/platform';

export const ProfileSettings: React.FC = () => {
  const {
    universalProfile,
    saveUniversalProfile,
    theme,
    toggleTheme,
    firebaseUser,
    workspaceMode,
    signInWithGoogleAccount,
    signOutWorkspace,
    resetProgress,
    deleteAccountAndData,
  } = useLearner();

  const [form, setForm] = useState<UniversalUserProfile>({ ...universalProfile });
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isEducator = ACCOUNT_ROLES.find((r) => r.id === form.personaType)?.isEducator ?? false;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedBanner(false);
    try {
      await saveUniversalProfile(form, false);
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            Account, Role &amp; Academic Profile
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            Profile &amp; Learning Environment Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Update your role, education level, institution details, preferred language, or workspace preferences anytime.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
          </button>
        </div>
      </div>

      {/* Authentication Status Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 text-white font-bold flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              {firebaseUser
                ? `Cloud Synced Account (${firebaseUser.email})`
                : 'Interactive Local Workspace'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {firebaseUser
                ? 'Your profile, courses, question bank, and exam history persist securely in Firestore.'
                : 'Sign in with Google anytime to back up and sync your academic profile across devices.'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!firebaseUser ? (
            <button
              type="button"
              onClick={() => signInWithGoogleAccount().catch(() => {})}
              className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
            >
              Connect Google Account
            </button>
          ) : (
            <button
              type="button"
              onClick={signOutWorkspace}
              className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Profile Form */}
      <form
        onSubmit={handleSave}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6"
      >
        {savedBanner && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Academic profile updated successfully.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Account Role
            </label>
            <select
              value={form.personaType}
              onChange={(e) =>
                setForm({ ...form, personaType: e.target.value as PersonaType })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            >
              {ACCOUNT_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} — {r.subtitle}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Country
            </label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Preferred Language
            </label>
            <select
              value={form.preferredLanguage}
              onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Institution Type
            </label>
            <select
              value={form.institutionType}
              onChange={(e) => setForm({ ...form, institutionType: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            >
              {INSTITUTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Institution Name (Optional)
            </label>
            <input
              type="text"
              value={form.institutionName}
              onChange={(e) => setForm({ ...form, institutionName: e.target.value })}
              placeholder="Independent learner if left blank"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Academic Category
            </label>
            <select
              value={form.educationCategory}
              onChange={(e) => {
                const cat = e.target.value as EducationCategory;
                setForm({
                  ...form,
                  educationCategory: cat,
                  educationLevel: EDUCATION_LEVELS_BY_CATEGORY[cat][0],
                });
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            >
              {(Object.keys(EDUCATION_LEVELS_BY_CATEGORY) as EducationCategory[]).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Education Level
            </label>
            <select
              value={form.educationLevel}
              onChange={(e) => setForm({ ...form, educationLevel: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            >
              {EDUCATION_LEVELS_BY_CATEGORY[form.educationCategory].map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          {form.educationCategory === 'Custom' && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Custom Academic Level / Programme
              </label>
              <input
                type="text"
                value={form.customEducationLevel}
                onChange={(e) => setForm({ ...form, customEducationLevel: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isEducator ? 'Classes / Courses Taught' : 'Class / Grade / Semester / Year'}
            </label>
            <input
              type="text"
              value={form.gradeOrYear}
              onChange={(e) => setForm({ ...form, gradeOrYear: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isEducator ? 'Designation' : 'Degree or Programme'}
            </label>
            <input
              type="text"
              value={isEducator ? form.designation : form.degreeOrProgramme}
              onChange={(e) =>
                isEducator
                  ? setForm({ ...form, designation: e.target.value })
                  : setForm({ ...form, degreeOrProgramme: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Department / Branch
            </label>
            <input
              type="text"
              value={form.departmentOrBranch}
              onChange={(e) => setForm({ ...form, departmentOrBranch: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isEducator ? 'Teaching Experience (Optional)' : 'Current Skill Level'}
            </label>
            {isEducator ? (
              <input
                type="text"
                value={form.teachingExperience}
                onChange={(e) => setForm({ ...form, teachingExperience: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              />
            ) : (
              <select
                value={form.skillLevel}
                onChange={(e) => setForm({ ...form, skillLevel: e.target.value as SkillTier })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              >
                <option value="foundational">Foundational</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="exam-prep">Exam-Prep</option>
              </select>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Learning or Teaching Goals
            </label>
            <textarea
              rows={2}
              value={form.learningGoals}
              onChange={(e) => setForm({ ...form, learningGoals: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Profile...' : 'Save Academic Profile'}</span>
          </button>
        </div>
      </form>

      {/* Data Controls: Reset Progress & Delete Account */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          Workspace Data &amp; Account Privacy Controls
        </h2>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              Reset Learning Mastery &amp; Revision Schedules
            </div>
            <p className="text-xs text-slate-500">
              Restores default starter mastery scores while keeping your profile.
            </p>
          </div>
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Progress</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  resetProgress();
                  setConfirmReset(false);
                }}
                className="px-3.5 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-bold text-sm text-rose-600 dark:text-rose-400">
              Delete Account Profile &amp; All Cloud / Local Records
            </div>
            <p className="text-xs text-slate-500">
              Permanently deletes your profile, courses, question sets, exams, and uploaded documents.
            </p>
          </div>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="px-4 py-2 rounded-lg border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account Data</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => deleteAccountAndData()}
                className="px-3.5 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold flex items-center gap-1"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Permanently Delete</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
