import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useLearner } from '../context/LearnerContext';
import {
  ACCOUNT_ROLES,
  EDUCATION_LEVELS_BY_CATEGORY,
  INSTITUTION_TYPES,
  SUPPORTED_LANGUAGES,
  UNIVERSAL_SUBJECT_LIBRARY,
} from '../data/academicCatalog';
import { EducationCategory, PersonaType, SkillTier, UniversalUserProfile } from '../types/platform';

export const OnboardingModal: React.FC = () => {
  const {
    showOnboardingModal,
    setShowOnboardingModal,
    universalProfile,
    saveUniversalProfile,
  } = useLearner();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [customSubjectInput, setCustomSubjectInput] = useState('');

  const [draft, setDraft] = useState<UniversalUserProfile>(() => ({
    ...universalProfile,
  }));

  const selectedRoleInfo = useMemo(
    () => ACCOUNT_ROLES.find((r) => r.id === draft.personaType) || ACCOUNT_ROLES[0],
    [draft.personaType]
  );

  const filteredLibrary = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return UNIVERSAL_SUBJECT_LIBRARY;
    return UNIVERSAL_SUBJECT_LIBRARY.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }, [subjectSearch]);

  if (!showOnboardingModal) return null;

  const toggleSubject = (name: string) => {
    setDraft((prev) => {
      const exists = prev.subjectsList.some((s) => s.toLowerCase() === name.toLowerCase());
      const next = exists
        ? prev.subjectsList.filter((s) => s.toLowerCase() !== name.toLowerCase())
        : [...prev.subjectsList, name];
      return { ...prev, subjectsList: next };
    });
  };

  const handleAddCustomSubject = () => {
    const val = customSubjectInput.trim();
    if (!val) return;
    if (!draft.subjectsList.some((s) => s.toLowerCase() === val.toLowerCase())) {
      setDraft((prev) => ({ ...prev, subjectsList: [...prev.subjectsList, val] }));
    }
    setCustomSubjectInput('');
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const finalProfile: UniversalUserProfile = {
        ...draft,
        displayName: draft.displayName.trim() || 'Academic Learner',
        subjectsList: draft.subjectsList.length > 0 ? draft.subjectsList : ['General Studies'],
        onboardingCompleted: true,
      };
      await saveUniversalProfile(finalProfile, true);
      setShowOnboardingModal(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Universal Academic Setup · Step {step} of 3
            </p>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {step === 1 && 'Choose Your Role & Identity'}
              {step === 2 && 'Select Education Level & Academic Context'}
              {step === 3 && 'Personalize Your Subjects & Courses'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowOnboardingModal(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            title="Skip setup for now"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Account Role (Can be updated anytime in Profile Settings)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ACCOUNT_ROLES.map((role) => {
                    const active = draft.personaType === role.id;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({ ...prev, personaType: role.id as PersonaType }))
                        }
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          active
                            ? 'border-sky-600 bg-sky-50/70 dark:bg-sky-950/40 ring-1 ring-sky-600'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {role.label}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {role.subtitle}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={draft.displayName}
                    onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
                    placeholder="e.g. Priya Nair / Dr. Marcus Vance"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                    placeholder="you@domain.com"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Country / Region
                  </label>
                  <input
                    type="text"
                    value={draft.country}
                    onChange={(e) => setDraft({ ...draft, country: e.target.value })}
                    placeholder="e.g. India, United States, UK, Singapore"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Preferred Language
                  </label>
                  <select
                    value={draft.preferredLanguage}
                    onChange={(e) => setDraft({ ...draft, preferredLanguage: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Institution Type
                  </label>
                  <select
                    value={draft.institutionType}
                    onChange={(e) => setDraft({ ...draft, institutionType: e.target.value })}
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
                    Institution Name <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={draft.institutionName}
                    onChange={(e) => setDraft({ ...draft, institutionName: e.target.value })}
                    placeholder="Leave blank for independent learning"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Academic Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(EDUCATION_LEVELS_BY_CATEGORY) as EducationCategory[]).map((cat) => {
                    const active = draft.educationCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            educationCategory: cat,
                            educationLevel: EDUCATION_LEVELS_BY_CATEGORY[cat][0],
                          }))
                        }
                        className={`px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                          active
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Education Level / Examination Stream
                  </label>
                  <select
                    value={draft.educationLevel}
                    onChange={(e) => setDraft({ ...draft, educationLevel: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  >
                    {EDUCATION_LEVELS_BY_CATEGORY[draft.educationCategory].map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                {draft.educationCategory === 'Custom' && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Specify Custom Academic Level or Programme
                    </label>
                    <input
                      type="text"
                      value={draft.customEducationLevel}
                      onChange={(e) =>
                        setDraft({ ...draft, customEducationLevel: e.target.value })
                      }
                      placeholder="e.g. Post-Doctoral Fellowship / Bar Exam / Aviation Licensing"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                {selectedRoleInfo.isEducator ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Designation / Title
                      </label>
                      <input
                        type="text"
                        value={draft.designation}
                        onChange={(e) => setDraft({ ...draft, designation: e.target.value })}
                        placeholder="e.g. Associate Professor / Senior Physics Teacher"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Classes / Grades / Courses Taught
                      </label>
                      <input
                        type="text"
                        value={draft.gradeOrYear}
                        onChange={(e) => setDraft({ ...draft, gradeOrYear: e.target.value })}
                        placeholder="e.g. CS-201, B.Tech Year 2, Class 11–12"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Department / Faculty
                      </label>
                      <input
                        type="text"
                        value={draft.departmentOrBranch}
                        onChange={(e) =>
                          setDraft({ ...draft, departmentOrBranch: e.target.value })
                        }
                        placeholder="e.g. Department of Computer Science"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Teaching Experience <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={draft.teachingExperience}
                        onChange={(e) =>
                          setDraft({ ...draft, teachingExperience: e.target.value })
                        }
                        placeholder="e.g. 8 years"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Class / Grade / Semester / Year
                      </label>
                      <input
                        type="text"
                        value={draft.gradeOrYear}
                        onChange={(e) => setDraft({ ...draft, gradeOrYear: e.target.value })}
                        placeholder="e.g. Class 10 / Semester 4 / Final Year"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Degree or Programme
                      </label>
                      <input
                        type="text"
                        value={draft.degreeOrProgramme}
                        onChange={(e) => setDraft({ ...draft, degreeOrProgramme: e.target.value })}
                        placeholder="e.g. B.Tech / MBBS / BA Economics / High School"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Department / Branch / Stream
                      </label>
                      <input
                        type="text"
                        value={draft.departmentOrBranch}
                        onChange={(e) =>
                          setDraft({ ...draft, departmentOrBranch: e.target.value })
                        }
                        placeholder="e.g. AI & Data Science / Commerce / Humanities"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Current Skill Level
                      </label>
                      <select
                        value={draft.skillLevel}
                        onChange={(e) =>
                          setDraft({ ...draft, skillLevel: e.target.value as SkillTier })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      >
                        <option value="foundational">Foundational (Building Core Basics)</option>
                        <option value="intermediate">Intermediate (Applying Concepts)</option>
                        <option value="advanced">Advanced (Deep Derivations &amp; Edge Cases)</option>
                        <option value="exam-prep">Exam-Prep (High-Rigor Timed Readiness)</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {selectedRoleInfo.isEducator
                      ? 'Teaching & Assessment Objectives'
                      : 'Primary Learning & Examination Goals'}
                  </label>
                  <textarea
                    rows={2}
                    value={draft.learningGoals}
                    onChange={(e) => setDraft({ ...draft, learningGoals: e.target.value })}
                    placeholder="e.g. Prepare for semester finals and GATE, master problem-solving speed, and review weak topics weekly."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    placeholder="Search 23+ academic subjects (Math, CS, Law, Medicine, History...)"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSubjectInput}
                    onChange={(e) => setCustomSubjectInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomSubject()}
                    placeholder="Or add custom subject..."
                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSubject}
                    className="px-3 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Selected Subjects Summary */}
              {draft.subjectsList.length > 0 && (
                <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/60 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-sky-800 dark:text-sky-300 mr-1">
                    Selected ({draft.subjectsList.length}):
                  </span>
                  {draft.subjectsList.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSubject(s)}
                      className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-700 text-xs font-semibold text-sky-700 dark:text-sky-300 flex items-center gap-1.5"
                    >
                      <span>{s}</span>
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}

              {/* Library Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {filteredLibrary.map((subj) => {
                  const isSelected = draft.subjectsList.some(
                    (s) => s.toLowerCase() === subj.name.toLowerCase()
                  );
                  return (
                    <button
                      key={subj.name}
                      type="button"
                      onClick={() => toggleSubject(subj.name)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2 ${
                        isSelected
                          ? 'border-sky-600 bg-sky-50/60 dark:bg-sky-950/40'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {subj.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {subj.description}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <span className="text-xs text-slate-400">
              Institution is optional · Independent learners welcome
            </span>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{saving ? 'Building Workspace...' : 'Save Academic Environment →'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
