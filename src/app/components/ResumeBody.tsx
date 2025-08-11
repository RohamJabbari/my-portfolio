"use client";
import React, { useState } from "react";
import resume from "@/app/data/resume.json";
import CopyAnimation from "@/app/components/CopyAnimation";

export default function Home() {
    const [emailCopied, setEmailCopied] = useState(false);
    const githubUrl = resume.personalInfo.github;
    const email = resume.personalInfo.email;

    const handleCopyEmail = async () => {
        try {
            await navigator.clipboard.writeText(email);
            setEmailCopied(true);
            setTimeout(() => setEmailCopied(false), 1000);
        } catch (e) {
            // fallback, do nothing
            console.error(e);
        }
    };

    return (
        <div id="resume-root" className="font-sans text-black max-w-3xl mx-auto p-4 sm:p-8 md:p-16" style={{ backgroundColor: "hsl(0, 0%, 94%)" }}>
            <header className="mb-12 text-center">
                <h1 className="text-4xl font-bold mb-2">{resume.personalInfo.name}</h1>
                <div className="flex flex-col items-center space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                        <span className="break-all">{githubUrl}</span>
                        <button
                            onClick={() => window.open(githubUrl, "_blank", "noopener,noreferrer")}
                            className="p-1 rounded hover:bg-gray-100 focus:outline-none transition"
                            aria-label="Open GitHub"
                            type="button"
                        >
                            {/* Link Icon SVG */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7m0 0v7m0-7L10 14m-4 7h7a2 2 0 002-2v-7" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="break-all">{email}</span>
                        <button
                            onClick={handleCopyEmail}
                            className="p-1 rounded hover:bg-gray-100 focus:outline-none transition"
                            aria-label="Copy Email"
                            type="button"
                        >
                            {/* Conditional Copy Icon or Tick Mark */}
                            {emailCopied ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-500 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
                                    <rect x="3" y="3" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
                                </svg>
                            )}
                        </button>
                        <a
                            href={`mailto:${email}`}
                            className="p-1 rounded hover:bg-gray-100 focus:outline-none transition inline-flex"
                            aria-label="Send Email"
                        >
                            {/* Mail Icon SVG */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v4a2 2 0 002 2h2m8 0v6a2 2 0 01-2 2H8a2 2 0 01-2-2v-6m10 0l-4 4m0 0l-4-4" />
                            </svg>
                        </a>
                    </div>
                </div>
                <div className="mt-2">
                    <CopyAnimation copied={emailCopied} />
                </div>
            </header>

            <section className="mb-10">
                <h2 className="text-gray-600 text-xl font-semibold mb-4">Work Experience</h2>
                {resume.workExperience.map(({ title, company, years, description }, index) => (
                    <div key={index} className="mb-6">
                        <h3 className="font-semibold text-lg">{title}</h3>
                        <p className="text-sm text-gray-700 italic">{company}{years ? ` — ${years}` : ''}</p>
                        <p className="mt-2 text-sm leading-relaxed">{description}</p>
                    </div>
                ))}
            </section>

            <section className="mb-10">
                <h2 className="text-gray-600 text-xl font-semibold mb-4">Projects</h2>
                {resume.projects.map(({ title, description }, index) => (
                    <div key={index} className="mb-6">
                        <h3 className="font-semibold text-lg">{title}</h3>
                        <p className="mt-2 text-sm leading-relaxed">{description}</p>
                    </div>
                ))}
            </section>

            <section className="mb-10">
                <h2 className="text-gray-600 text-xl font-semibold mb-4">Education</h2>
                {resume.education.map(({ degree, institution, years, noteworthyProjects }, index) => (
                    <div key={index} className="mb-6">
                        <h3 className="font-semibold text-lg">{degree}</h3>
                        <p className="text-sm text-gray-700 italic">{institution}{years ? ` — ${years}` : ''}</p>
                        {noteworthyProjects && noteworthyProjects.length > 0 && (
                            <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                                {noteworthyProjects.map((project, i) => (
                                    <li
                                        key={i}
                                        className="pl-1"
                                        style={{ textIndent: '-1rem', paddingLeft: '1rem' }}
                                    >
                                        <span className="font-medium">{project.title}</span>: {project.description}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}
            </section>

            <section className="mb-10">
                <h2 className="text-gray-600 text-xl font-semibold mb-4">Hard Skills</h2>
                <ul className="list-disc list-inside text-sm space-y-1">
                    {resume.hardSkills.map((skill, index) => (
                        <li
                            key={index}
                            className="pl-1"
                            style={{ textIndent: '-1rem', paddingLeft: '1rem' }}
                        >
                            {skill}
                        </li>
                    ))}
                </ul>
            </section>

            <section className="mb-10">
                <h2 className="text-gray-600 text-xl font-semibold mb-4">Soft Skills</h2>
                <ul className="list-disc list-inside text-sm space-y-1">
                    {resume.softSkills.map((skill, index) => (
                        <li
                            key={index}
                            className="pl-1"
                            style={{ textIndent: '-1rem', paddingLeft: '1rem' }}
                        >
                            {skill}
                        </li>
                    ))}
                </ul>
            </section>

            {resume.languages && resume.languages.length > 0 && (
                <section className="mb-10">
                    <h2 className="text-gray-600 text-xl font-semibold mb-4">Languages</h2>
                    <ul className="list-disc list-inside text-sm space-y-1">
                        {resume.languages.map((language, index) => (
                            <li
                                key={index}
                                className="pl-1"
                                style={{ textIndent: '-1rem', paddingLeft: '1rem' }}
                            >
                                {language}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
