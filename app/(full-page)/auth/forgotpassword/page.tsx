"use client";
import type { Page } from "@/types/index";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { useContext, useState, useRef } from "react";
import { LayoutContext } from "../../../../layout/context/layoutcontext";
import { Toast } from "primereact/toast";

const ForgotPassword: Page = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const router = useRouter();
    const { layoutConfig } = useContext(LayoutContext);
    const toast = useRef<Toast>(null);
    const dark = layoutConfig.colorScheme !== "light";

    const handleSubmit = async () => {
        if (!email) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Please enter your email address',
                life: 3000
            });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setSubmitted(true);
                toast.current?.show({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Password reset email sent successfully',
                    life: 3000
                });
            } else {
                toast.current?.show({
                    severity: 'error',
                    summary: 'Error',
                    detail: data.error || 'Failed to send reset email',
                    life: 3000
                });
            }
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'An unexpected error occurred',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Toast ref={toast} />
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 1600 800"
                className="fixed left-0 top-0 min-h-screen min-w-screen"
                preserveAspectRatio="none"
            >
                <rect
                    fill={dark ? "var(--primary-900)" : "var(--primary-500)"}
                    width="1600"
                    height="800"
                />
                <path
                    fill={dark ? "var(--primary-800)" : "var(--primary-400)"}
                    d="M478.4 581c3.2 0.8 6.4 1.7 9.5 2.5c196.2 52.5 388.7 133.5 593.5 176.6c174.2 36.6 349.5 29.2 518.6-10.2V0H0v574.9c52.3-17.6 106.5-27.7 161.1-30.9C268.4 537.4 375.7 554.2 478.4 581z"
                />
                <path
                    fill={dark ? "var(--primary-700)" : "var(--primary-300)"}
                    d="M181.8 259.4c98.2 6 191.9 35.2 281.3 72.1c2.8 1.1 5.5 2.3 8.3 3.4c171 71.6 342.7 158.5 531.3 207.7c198.8 51.8 403.4 40.8 597.3-14.8V0H0v283.2C59 263.6 120.6 255.7 181.8 259.4z"
                />
                <path
                    fill={dark ? "var(--primary-600)" : "var(--primary-200)"}
                    d="M454.9 86.3C600.7 177 751.6 269.3 924.1 325c208.6 67.4 431.3 60.8 637.9-5.3c12.8-4.1 25.4-8.4 38.1-12.9V0H288.1c56 21.3 108.7 50.6 159.7 82C450.2 83.4 452.5 84.9 454.9 86.3z"
                />
                <path
                    fill={dark ? "var(--primary-500)" : "var(--primary-100)"}
                    d="M1397.5 154.8c47.2-10.6 93.6-25.3 138.6-43.8c21.7-8.9 43-18.8 63.9-29.5V0H643.4c62.9 41.7 129.7 78.2 202.1 107.4C1020.4 178.1 1214.2 196.1 1397.5 154.8z"
                />
            </svg>
            <div className="min-h-screen flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
                <div className="border-1 surface-border surface-card border-round py-7 px-4 md:px-7 z-1">
                    <div className="mb-4">
                        <div className="text-900 text-xl font-bold mb-2">
                            Forgot Password
                        </div>
                        <span className="text-600 font-medium">
                            {submitted 
                                ? "Check your email for password reset instructions"
                                : "Enter your email to reset your password"
                            }
                        </span>
                    </div>
                    {!submitted ? (
                        <div className="flex flex-column">
                            <span className="p-input-icon-left w-full mb-4">
                                <i className="pi pi-envelope"></i>
                                <InputText
                                    id="email"
                                    type="email"
                                    className="w-full md:w-25rem"
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                                />
                            </span>
                            <div className="flex flex-wrap gap-2 justify-content-between">
                                <Button
                                    label="Back to Login"
                                    outlined
                                    className="flex-auto"
                                    onClick={() => router.push("/auth/login")}
                                    disabled={loading}
                                ></Button>
                                <Button
                                    label={loading ? "Sending..." : "Submit"}
                                    className="flex-auto"
                                    onClick={handleSubmit}
                                    loading={loading}
                                    disabled={loading}
                                ></Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-column">
                            <div className="text-center mb-4">
                                <i className="pi pi-check-circle text-6xl text-green-500 mb-3"></i>
                                <p className="text-600">
                                    We've sent a password reset link to <strong>{email}</strong>
                                </p>
                            </div>
                            <Button
                                label="Back to Login"
                                className="w-full"
                                onClick={() => router.push("/auth/login")}
                            ></Button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ForgotPassword;
