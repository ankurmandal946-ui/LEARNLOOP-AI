import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Copy,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { CONCEPTS, INITIAL_DEMO_COHORT } from '../data/physicsConcepts';
import { CohortStudent, ConceptId } from '../types/physics';
import { ClassAssignmentItem, ClassRosterStudent } from '../types/platform';
import { useLearner } from '../context/LearnerContext';
import { AgentActivityHistory } from '../components/AgentActivityHistory';

export const TeacherDashboard: React.FC = () => {
  const {
    universalProfile,
    subjects,
    questionSets,
    educatorClasses,
    createEducatorClass,
    updateEducatorClass,
    deleteEducatorClass,
    getTeacherAnalytics,
    agentActivityLogs,
  } = useLearner();

  const [activeTab, setActiveTab] = useState<'workspace' | 'demo_cohort'>('workspace');

  // Create Class State
  const [clsName, setClsName] = useState('');
  const [clsSubject, setClsSubject] = useState(subjects[0]?.name || 'Computer Science');
  const [clsLevel, setClsLevel] = useState(universalProfile.educationLevel || 'Undergraduate');
  const [clsInst, setClsInst] = useState(universalProfile.institutionName || '');
  const [clsDept, setClsDept] = useState(universalProfile.departmentOrBranch || '');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(
    educatorClasses[0]?.id || null
  );

  // Roster & Assignment Forms
  const [studentNameInput, setStudentNameInput] = useState('');
  const [studentEmailInput, setStudentEmailInput] = useState('');
  const [csvText, setCsvText] = useState('');
  const [csvFeedback, setCsvFeedback] = useState<string | null>(null);

  const [asgTitle, setAsgTitle] = useState('');
  const [asgDueDate, setAsgDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [asgQSetId, setAsgQSetId] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Demo Cohort State
  const analyticsReport = getTeacherAnalytics();
  const [demoStudents] = useState<CohortStudent[]>(INITIAL_DEMO_COHORT);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterConcept, setFilterConcept] = useState<string>('all');
  const [selectedDemoStudent, setSelectedDemoStudent] = useState<CohortStudent | null>(null);

  const activeClass =
    educatorClasses.find((c) => c.id === selectedClassId) || educatorClasses[0];

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clsName.trim()) return;
    const created = await createEducatorClass({
      name: clsName.trim(),
      subjectName: clsSubject.trim(),
      educationLevel: clsLevel.trim(),
      institutionName: clsInst.trim(),
      departmentName: clsDept.trim(),
    });
    setSelectedClassId(created.id);
    setClsName('');
  };

  const handleAddStudentManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || !studentNameInput.trim()) return;
    const newStudent: ClassRosterStudent = {
      id: `st-${Date.now()}`,
      name: studentNameInput.trim(),
      email: studentEmailInput.trim() || 'student@institution.edu',
      joinedAt: new Date().toLocaleDateString(),
      overallMastery: 65,
      weakTopic: 'Baseline Pending',
      submissionsCount: 0,
    };
    await updateEducatorClass(activeClass.id, {
      rosterList: [...activeClass.rosterList, newStudent],
    });
    setStudentNameInput('');
    setStudentEmailInput('');
  };

  const handleImportCsv = async () => {
    if (!activeClass || !csvText.trim()) return;
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed: ClassRosterStudent[] = [];
    for (const line of lines) {
      if (line.toLowerCase().startsWith('name,')) continue;
      const parts = line.split(',').map((p) => p.trim());
      if (parts[0]) {
        parsed.push({
          id: `st-${Date.now()}-${parsed.length}`,
          name: parts[0].slice(0, 120),
          email: (parts[1] || 'learner@campus.edu').slice(0, 254),
          joinedAt: 'CSV Import',
          overallMastery: 60,
          weakTopic: 'Awaiting Diagnostic',
          submissionsCount: 0,
        });
      }
    }
    if (parsed.length === 0) {
      setCsvFeedback('Provide at least one valid "Name, Email" row.');
      return;
    }
    await updateEducatorClass(activeClass.id, {
      rosterList: [...activeClass.rosterList, ...parsed].slice(0, 50),
    });
    setCsvText('');
    setCsvFeedback(`Imported ${parsed.length} student(s) into ${activeClass.name}.`);
  };

  const handlePublishAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || !asgTitle.trim()) return;
    const linkedSet = questionSets.find((q) => q.id === asgQSetId);
    const newAsg: ClassAssignmentItem = {
      id: `asg-${Date.now()}`,
      title: asgTitle.trim(),
      questionSetId: linkedSet?.id,
      dueDate: asgDueDate,
      totalMarks: linkedSet
        ? linkedSet.questionCount * linkedSet.marksPerQuestion
        : 20,
      questionCount: linkedSet ? linkedSet.questionCount : 10,
      status: 'active',
    };
    await updateEducatorClass(activeClass.id, {
      assignmentsList: [newAsg, ...activeClass.assignmentsList],
    });
    setAsgTitle('');
  };

  const filteredDemoStudents = demoStudents.filter((st) => {
    const matchesSearch = st.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterConcept === 'all' || st.weakestConcept === filterConcept;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            Teacher, Professor, Mentor &amp; Institution Workspace
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            Classes, Batches, Assignments &amp; Cohort Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage real academic cohorts, invite students via code or CSV, publish question sets, and inspect misconception heatmaps.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('workspace')}
            className={`px-3.5 py-2 rounded-lg font-bold transition-all ${
              activeTab === 'workspace'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            My Classes &amp; Assignments ({educatorClasses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('demo_cohort')}
            className={`px-3.5 py-2 rounded-lg font-bold transition-all ${
              activeTab === 'demo_cohort'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Sample Cohort Analytics (Demo)
          </button>
        </div>
      </div>

      {activeTab === 'workspace' ? (
        <div className="space-y-8">
          {/* Create New Class / Batch / Department Course */}
          <form
            onSubmit={handleCreateClass}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4"
          >
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Create Class, University Course Section, or Coaching Batch
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <input
                type="text"
                required
                value={clsName}
                onChange={(e) => setClsName(e.target.value)}
                placeholder="Class / Batch Name (e.g. CS-201 Fall)"
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
              />
              <input
                type="text"
                required
                value={clsSubject}
                onChange={(e) => setClsSubject(e.target.value)}
                placeholder="Subject (e.g. Algorithms)"
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={clsLevel}
                onChange={(e) => setClsLevel(e.target.value)}
                placeholder="Academic Level"
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={clsInst}
                onChange={(e) => setClsInst(e.target.value)}
                placeholder="Institution / Dept (Optional)"
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Class</span>
              </button>
            </div>
          </form>

          {educatorClasses.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-2">
              <Users className="w-8 h-8 text-sky-500 mx-auto" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                No Real Educator Classes Created Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Create your first class or university section above to generate an invite code, import students via CSV, and assign tests. Or switch to "Sample Cohort Analytics (Demo)" to preview multi-student misconception heatmaps.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left 4 Cols: Class List */}
              <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Managed Classes ({educatorClasses.length})
                </h3>
                <div className="space-y-2">
                  {educatorClasses.map((c) => {
                    const isSelected = activeClass?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedClassId(c.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'border-sky-600 bg-sky-50/70 dark:bg-sky-950/40'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {c.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {c.subjectName} · {c.rosterList.length} students · Code:{' '}
                            <span className="font-mono font-semibold">{c.inviteCode}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteEducatorClass(c.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right 8 Cols: Active Class Roster, CSV Import & Assignments */}
              {activeClass && (
                <div className="lg:col-span-8 space-y-6">
                  {/* Class Banner & Invite Code */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                        {activeClass.subjectName} · {activeClass.educationLevel}
                      </span>
                      <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                        {activeClass.name}
                      </h2>
                      {activeClass.institutionName && (
                        <p className="text-xs text-slate-500">{activeClass.institutionName}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">
                          Student Invite Code
                        </div>
                        <div className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                          {activeClass.inviteCode}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(activeClass.inviteCode);
                          setCopiedCode(activeClass.inviteCode);
                          setTimeout(() => setCopiedCode(null), 2000);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                        title="Copy invite code"
                      >
                        {copiedCode === activeClass.inviteCode ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Publish Assignment / Test */}
                  <form
                    onSubmit={handlePublishAssignment}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-sky-500" />
                      <span>Publish Class Assignment, Quiz, or Exam</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <input
                        type="text"
                        required
                        value={asgTitle}
                        onChange={(e) => setAsgTitle(e.target.value)}
                        placeholder="Assignment Title (e.g. Midterm Quiz 1)"
                        className="sm:col-span-5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                      />
                      <select
                        value={asgQSetId}
                        onChange={(e) => setAsgQSetId(e.target.value)}
                        className="sm:col-span-4 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                      >
                        <option value="">Attach Question Bank Set (Optional)</option>
                        {questionSets.map((qs) => (
                          <option key={qs.id} value={qs.id}>
                            {qs.title} ({qs.questionCount}Q)
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={asgDueDate}
                        onChange={(e) => setAsgDueDate(e.target.value)}
                        className="sm:col-span-3 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
                      >
                        Assign to Cohort
                      </button>
                    </div>

                    {activeClass.assignmentsList.length > 0 && (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {activeClass.assignmentsList.map((a) => (
                          <div
                            key={a.id}
                            className="py-2.5 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {a.title}
                              </span>
                              <span className="text-slate-500 ml-2">
                                {a.questionCount}Q · {a.totalMarks} Marks · Due {a.dueDate}
                              </span>
                            </div>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 uppercase text-[10px]">
                              {a.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </form>

                  {/* Student Roster + Manual & CSV Import */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Class Student Roster ({activeClass.rosterList.length})
                    </h3>

                    <form
                      onSubmit={handleAddStudentManual}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2.5"
                    >
                      <input
                        type="text"
                        required
                        value={studentNameInput}
                        onChange={(e) => setStudentNameInput(e.target.value)}
                        placeholder="Student Full Name"
                        className="sm:col-span-5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                      />
                      <input
                        type="email"
                        value={studentEmailInput}
                        onChange={(e) => setStudentEmailInput(e.target.value)}
                        placeholder="Email Address"
                        className="sm:col-span-5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                      />
                      <button
                        type="submit"
                        className="sm:col-span-2 px-3 py-2 rounded-lg bg-sky-600 text-white text-xs font-bold"
                      >
                        + Add
                      </button>
                    </form>

                    {/* CSV Bulk Import */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-sky-500" />
                          <span>Bulk Import Roster via CSV (Format: Name, Email)</span>
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        value={csvText}
                        onChange={(e) => setCsvText(e.target.value)}
                        placeholder={'Riya Sen, riya@university.edu\nLiam Chen, liam@university.edu'}
                        className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          {csvFeedback}
                        </span>
                        <button
                          type="button"
                          onClick={handleImportCsv}
                          className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold"
                        >
                          Import CSV Rows
                        </button>
                      </div>
                    </div>

                    {activeClass.rosterList.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="border-y border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3">Student</th>
                              <th className="py-2.5 px-3">Email</th>
                              <th className="py-2.5 px-3">Mastery</th>
                              <th className="py-2.5 px-3">Joined</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {activeClass.rosterList.map((st) => (
                              <tr key={st.id}>
                                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                                  {st.name}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500">{st.email}</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-sky-600">
                                  {st.overallMastery}%
                                </td>
                                <td className="py-2.5 px-3 text-slate-400">{st.joinedAt}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* =====================================================================
           TAB 2: CLEARLY LABELED SAMPLE DEMO COHORT ANALYTICS (PHYSICS)
           ===================================================================== */
        <div className="space-y-8">
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs flex items-center justify-between">
            <span>
              <strong>Sample Demo Cohort Preview:</strong> Showing illustrative Class 10 Physics Section A cohort metrics to demonstrate concept heatmaps and misconception clustering. Use the "My Classes &amp; Assignments" tab for real rosters.
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Concept Mastery Distribution Heatmap
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                Cohort Avg: {analyticsReport.cohortAverage}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {(Object.keys(CONCEPTS) as ConceptId[]).map((cid) => {
                const avg = analyticsReport.conceptAverages[cid] || 50;
                const info = CONCEPTS[cid];
                const colorClass =
                  avg >= 80
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : avg >= 65
                    ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200';

                return (
                  <div
                    key={cid}
                    className={`p-4 rounded-xl border ${colorClass} space-y-2 flex flex-col justify-between`}
                  >
                    <div>
                      <div className="font-bold text-xs truncate">{info.name}</div>
                      <div className="text-[11px] opacity-75">{info.formula}</div>
                    </div>
                    <div className="pt-2">
                      <div className="text-2xl font-mono font-extrabold tabular-nums">{avg}%</div>
                      <div className="text-[10px] uppercase font-semibold opacity-80">
                        {avg < 65 ? 'Intervention Recommended' : 'Cohort Proficient'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Sample Student Roster
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search student..."
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <select
                  value={filterConcept}
                  onChange={(e) => setFilterConcept(e.target.value)}
                  className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                >
                  <option value="all">Filter: All Weak Areas</option>
                  {(Object.keys(CONCEPTS) as ConceptId[]).map((cid) => (
                    <option key={cid} value={cid}>
                      Weakest: {CONCEPTS[cid].name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/70 border-y border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Overall Score</th>
                    <th className="py-3 px-4">Weakest Concept</th>
                    <th className="py-3 px-4">Active Misconceptions</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredDemoStudents.map((st) => (
                    <tr
                      key={st.id}
                      onClick={() => setSelectedDemoStudent(st)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-950/50 cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {st.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                        {st.overallScore}%
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        {CONCEPTS[st.weakestConcept]?.name}
                      </td>
                      <td className="py-3.5 px-4">
                        {st.identifiedMisconceptions[0] || 'None flagged'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDemoStudent(st);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs font-medium"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <AgentActivityHistory logs={agentActivityLogs} />
        </div>
      )}

      {selectedDemoStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-bold text-amber-600 uppercase">
                  Sample Demo Student Record
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {selectedDemoStudent.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDemoStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {(Object.keys(selectedDemoStudent.conceptScores) as ConceptId[]).map((cid) => (
                <div key={cid} className="flex justify-between">
                  <span>{CONCEPTS[cid].name}</span>
                  <span className="font-mono font-bold">
                    {selectedDemoStudent.conceptScores[cid]}%
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedDemoStudent(null)}
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
