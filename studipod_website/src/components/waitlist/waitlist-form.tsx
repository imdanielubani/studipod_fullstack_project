"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUp, CircleAlert, LoaderCircle } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WaitlistSuccess } from "@/components/waitlist/waitlist-success";
import {
  waitlistFormSchema,
  type WaitlistFormInput,
  type WaitlistFormValues,
} from "@/lib/validations/waitlist.schema";
import { submitWaitlist } from "@/lib/waitlist-client";
import type { FieldErrors } from "@/types/waitlist";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const FIELD_NAMES = ["fullName", "email", "examinationCategory"] as const;

type Registered = { fullName: string; email: string };

export function WaitlistForm() {
  const [registered, setRegistered] = useState<Registered | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WaitlistFormInput, unknown, WaitlistFormValues>({
    resolver: zodResolver(waitlistFormSchema),
    mode: "onTouched",
    defaultValues: { fullName: "", email: "", examinationCategory: "" },
  });

  function applyFieldErrors(fieldErrors: FieldErrors | undefined) {
    if (!fieldErrors) return;
    for (const field of FIELD_NAMES) {
      const message = fieldErrors[field];
      if (message) setError(field, { message });
    }
  }

  const onSubmit = async (values: WaitlistFormValues) => {
    setFormError(null);
    const result = await submitWaitlist({
      fullName: values.fullName,
      email: values.email,
      examinationCategory: values.examinationCategory || undefined,
    });

    if (result.success) {
      setRegistered({ fullName: values.fullName, email: values.email });
      return;
    }

    const { code, message, fieldErrors } = result.error;
    if (code === "ALREADY_REGISTERED") {
      setError("email", { message }, { shouldFocus: true });
      return;
    }
    applyFieldErrors(fieldErrors);
    setFormError(message);
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {registered ? (
        <m.div
          key="success"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        >
          <WaitlistSuccess fullName={registered.fullName} email={registered.email} />
        </m.div>
      ) : (
        <m.form
          key="form"
          noValidate
          aria-label="Join the StudiPod waitlist"
          aria-busy={isSubmitting}
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
          exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.25 } }}
        >
          <Input
            id="waitlist-full-name"
            label="Full name"
            autoComplete="name"
            placeholder="Your full name"
            error={errors.fullName?.message}
            readOnly={isSubmitting}
            {...register("fullName")}
          />
          <Input
            id="waitlist-email"
            type="email"
            label="Email address"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            readOnly={isSubmitting}
            {...register("email")}
          />
          <Input
            id="waitlist-category"
            label="Examination or professional category"
            isOptional
            placeholder="e.g. your exam or specialty"
            error={errors.examinationCategory?.message}
            readOnly={isSubmitting}
            {...register("examinationCategory")}
          />

          <div aria-live="assertive" className="empty:-mt-5">
            {formError ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-md bg-accent-100/60 px-4 py-3 text-sm text-danger"
              >
                <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {formError}
              </p>
            ) : null}
          </div>

          <Button type="submit" size="lg" disabled={isSubmitting} className="mt-1 w-full">
            {isSubmitting ? (
              <>
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                Requesting access…
              </>
            ) : (
              <>
                Request Early Access
                <ArrowUp
                  aria-hidden="true"
                  className="size-4 transition-transform duration-(--duration-base) ease-(--ease-out-expo) group-hover/button:-translate-y-0.5"
                />
              </>
            )}
          </Button>
        </m.form>
      )}
    </AnimatePresence>
  );
}
