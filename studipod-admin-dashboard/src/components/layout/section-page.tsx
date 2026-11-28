'use client';

import { Construction, ShieldAlert } from 'lucide-react';

import { ContentCard, ContentEmpty } from '@/components/shared/content-state';

import { PageContent, PageHeader, type Crumb } from './page-header';

type SectionPageProps = {
  title: string;
  /** Name used in the "not available yet" message; defaults to the title. */
  featureName?: string;
  breadcrumb: ReadonlyArray<Crumb>;
  description?: string;
  /** False when the administrator lacks the page's permission (presentation only). */
  isAllowed: boolean;
  permission?: string;
};

/**
 * A console destination whose screens are not built yet. Shows the page header
 * and an honest state in the content slot; never placeholder data.
 */
export function SectionPage({
  title,
  featureName = title,
  breadcrumb,
  description,
  isAllowed,
  permission,
}: SectionPageProps) {
  return (
    <>
      <PageHeader title={title} breadcrumb={breadcrumb} description={description} />
      <PageContent>
        <ContentCard>
          {isAllowed ? (
            <ContentEmpty
              icon={Construction}
              title={`${featureName} isn’t available yet`}
              description="This part of the admin console is being built. It will appear here when it’s ready."
            />
          ) : (
            <ContentEmpty
              icon={ShieldAlert}
              title="You don’t have access to this page"
              description={
                permission
                  ? `It needs the ${permission} permission. Ask a Super Admin if you need it.`
                  : 'Ask a Super Admin if you need it.'
              }
            />
          )}
        </ContentCard>
      </PageContent>
    </>
  );
}
