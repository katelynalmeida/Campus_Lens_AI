import React, { useState, useRef } from 'react';
import { 
  detectImageWithAI, 
  createIssue, 
  ISSUE_CATEGORIES, 
  PRIORITIES 
} from '../api/client';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  RefreshCw, 
  ArrowRight, 
  FileText, 
  Building, 
  HelpCircle,
  Eye,
  Info
} from 'lucide-react';
import { PriorityBadge } from '../components/StatusBadge';

export default function ReportIssue({ setCurrentTab, setSelectedIssueId, initialLocation }) {
  // Image state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadedPath, setUploadedPath] = useState(null);

  // AI analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(ISSUE_CATEGORIES[0]);
  const [priority, setPriority] = useState('Medium');
  const [location, setLocation] = useState(initialLocation || '');
  const [description, setDescription] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAiError("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setAiError("Image file size exceeds 8 MB limit.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAiResult(null);
    setAiError(null);
    setUploadedPath(null);
    setSubmitError(null);
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setAiResult(null);
    setAiError(null);
    setUploadedPath(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // Run AI vision classification
  const handleAnalyzeImage = async () => {
    if (!selectedFile) return;

    try {
      setAnalyzing(true);
      setAiError(null);
      const res = await detectImageWithAI(selectedFile);
      setAiResult(res);
      if (res.saved_image_path) {
        setUploadedPath(res.saved_image_path);
      }
      // Pre-fill suggested category if not "No obvious visible issue"
      if (res.suggested_category && res.suggested_category !== "No obvious visible issue") {
        setCategory(res.suggested_category);
      }
    } catch (err) {
      setAiError(err.message || "Failed to analyze image with vision model.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setSubmitError("Please enter an issue title.");
      return;
    }
    if (!location.trim()) {
      setSubmitError("Please specify the building and room/location.");
      return;
    }
    if (!description.trim() || description.trim().length < 5) {
      setSubmitError("Please enter a clear description (at least 5 characters).");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      // If user selected an image but hasn't analyzed it yet, analyze it first to upload
      let finalImagePath = uploadedPath;
      let finalAiCategory = aiResult?.suggested_category || null;
      let finalConfidence = aiResult?.top_alternatives?.[0]?.score || null;

      if (selectedFile && !finalImagePath) {
        try {
          const res = await detectImageWithAI(selectedFile);
          finalImagePath = res.saved_image_path;
          if (!finalAiCategory) finalAiCategory = res.suggested_category;
          if (!finalConfidence && res.top_alternatives?.[0]) finalConfidence = res.top_alternatives[0].score;
        } catch (uploadErr) {
          // If image processing fails, alert user but give option
          setSubmitError(`Image upload failed: ${uploadErr.message}`);
          setSubmitting(false);
          return;
        }
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
        priority,
        image_path: finalImagePath,
        ai_suggested_category: finalAiCategory,
        ai_confidence_score: finalConfidence
      };

      const created = await createIssue(payload);
      setSubmitSuccess(created);
    } catch (err) {
      setSubmitError(err.message || "Failed to submit issue report.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    handleClearImage();
    setTitle('');
    setCategory(ISSUE_CATEGORIES[0]);
    setPriority('Medium');
    setLocation('');
    setDescription('');
    setSubmitSuccess(null);
    setSubmitError(null);
  };

  // Success view
  if (submitSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-white rounded-3xl border border-slate-200/80 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Report Successfully Logged</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Issue Ticket #{submitSuccess.id}
          </h2>
          <p className="text-slate-600 text-sm mt-2 max-w-md mx-auto">
            Your maintenance request has been permanently saved to the campus database and dispatched for facilities review.
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 text-left space-y-2 text-xs sm:text-sm">
          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Title:</span>
            <span className="font-semibold text-slate-800">{submitSuccess.title}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Category:</span>
            <span className="font-semibold text-slate-800">{submitSuccess.category}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Location:</span>
            <span className="font-semibold text-slate-800">{submitSuccess.location}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Priority:</span>
            <PriorityBadge priority={submitSuccess.priority} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => {
              if (setSelectedIssueId) setSelectedIssueId(submitSuccess.id);
              setCurrentTab('tracking');
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-600/30 transition active:scale-95"
          >
            <Eye className="w-4 h-4" />
            <span>Track This Issue</span>
          </button>
          <button
            onClick={handleResetForm}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            Report Another Issue
          </button>
          <button
            onClick={() => setCurrentTab('overview')}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-medium text-sm text-slate-500 hover:text-slate-900 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Intro Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-600" />
            AI-Powered Campus Issue Detection
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Take or upload a photo to let zero-shot computer vision identify the issue, or fill in the details manually.
          </p>
        </div>
        <div className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
          Photo optional • Manual entry supported
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Photo Upload & AI Detection (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-brand-600" />
                Photo Evidence
              </span>
              {selectedFile && (
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>

            {/* Hidden file & camera inputs */}
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/jpeg,image/png,image/webp" 
              onChange={handleFileChange}
              className="hidden" 
            />
            <input 
              ref={cameraInputRef}
              type="file" 
              accept="image/*" 
              capture="environment"
              onChange={handleFileChange}
              className="hidden" 
            />

            {/* Image Preview or Dropzone */}
            {previewUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group">
                <img 
                  src={previewUrl} 
                  alt="Issue preview" 
                  className="w-full h-56 object-cover object-center group-hover:opacity-90 transition"
                />
                <div className="p-2.5 bg-slate-900/90 text-white text-[11px] flex justify-between items-center">
                  <span className="truncate max-w-[180px]">{selectedFile?.name}</span>
                  <span className="text-slate-400 font-mono">
                    {(selectedFile?.size / 1024).toFixed(0)} KB
                  </span>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 hover:border-brand-400 rounded-2xl p-6 text-center transition flex flex-col items-center justify-center bg-slate-50/60">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                  Select or Capture Issue Photo
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[220px]">
                  Supports JPG, PNG, WebP up to 8 MB.
                </p>

                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-sm"
                  >
                    Browse Device
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-sm flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Take Photo
                  </button>
                </div>
              </div>
            )}

            {/* AI Analyze Action Button */}
            {selectedFile && !aiResult && (
              <button
                type="button"
                onClick={handleAnalyzeImage}
                disabled={analyzing}
                className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 text-white shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing with Hugging Face CLIP...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Analyze Image with AI</span>
                  </>
                )}
              </button>
            )}

            {/* AI Error Alert */}
            {aiError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>AI Detection Notice</span>
                </div>
                <p>{aiError}</p>
                <p className="text-[11px] text-rose-600 font-medium">
                  You can proceed by selecting the category manually in the form.
                </p>
              </div>
            )}

            {/* AI Vision Results Display */}
            {aiResult && (
              <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-brand-800 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                    AI Prediction Result
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Model: CLIP ViT
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-brand-100 shadow-sm">
                  <div className="text-[11px] text-slate-500">Suggested Category</div>
                  <div className="font-extrabold text-sm text-slate-900 mt-0.5">
                    {aiResult.suggested_category}
                  </div>
                  {aiResult.top_alternatives?.[0] && (
                    <div className="text-[11px] text-brand-600 font-semibold mt-1">
                      Visual Relevance Score: {aiResult.top_alternatives[0].score.toFixed(3)}
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {aiResult.message}
                </p>

                {/* Alternative predictions */}
                {aiResult.top_alternatives?.length > 1 && (
                  <div className="space-y-1.5 pt-2 border-t border-brand-200/60">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      Alternative Predictions:
                    </span>
                    <div className="space-y-1">
                      {aiResult.top_alternatives.slice(1, 4).map((alt, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-white/80 border border-slate-200/60 text-xs"
                        >
                          <span className="truncate pr-2 text-slate-700">{alt.category}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-[10px] text-slate-400">
                              {alt.score.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setCategory(alt.category)}
                              className="text-[10px] font-bold text-brand-600 hover:text-brand-800 hover:underline"
                            >
                              Choose
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-2 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-800 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>Scores reflect visual similarity, not guaranteed hazard safety. Verify before submitting.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Structured Issue Form (7 cols) */}
        <div className="lg:col-span-7">
          <form 
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4"
          >
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Issue Details</h3>
              <p className="text-xs text-slate-500">Provide precise facility information to expedite repair.</p>
            </div>

            {/* Error banner */}
            {submitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Issue Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Flickering tube light in Computer Lab 3"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                required
              />
            </div>

            {/* Category selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Issue Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
              >
                {ISSUE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {aiResult && category === aiResult.suggested_category && (
                <p className="text-[11px] text-brand-600 font-medium mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Auto-selected from AI detection
                </p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Campus Location (Building, Floor, Room) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Block B - Academic Wing, Room 301 (Back row)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                required
              />
            </div>

            {/* Priority selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Priority Level <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRIORITIES.map((p) => {
                  const isSelected = priority === p;
                  return (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        isSelected 
                          ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20' 
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{p}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {priority === 'Critical' && '⚠️ Immediate hazard or disruption; groundskeepers alerted instantly.'}
                {priority === 'High' && 'High urgency; impairs normal classroom or facility operations.'}
                {priority === 'Medium' && 'Standard maintenance; scheduled within 24-48 hours.'}
                {priority === 'Low' && 'Minor aesthetic or non-urgent repair.'}
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Detailed Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe what is broken, visible hazards, how long it has occurred, or specific instructions for the repair team..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition resize-none"
                required
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-6 rounded-xl font-bold text-sm bg-brand-600 hover:bg-brand-700 active:scale-98 text-white shadow-lg shadow-brand-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Validating & Logging to SQLite Database...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Maintenance Report</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
