// AutoBreadcrumb.tsx — P0 Navigation Fix
//
// Auto-generating breadcrumb trail from the current route.
// Uses the existing Radix-UI breadcrumb primitives from ui/breadcrumb.tsx.
// Renders on all deep pages (depth > 1) for clear back-navigation.

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/breadcrumb';

const ROUTE_LABELS: Record<string, string> = {
  terminal: 'Layoff Audit',
  'risk-calculator': 'Risk Calculator',
  settings: 'Settings',
  pricing: 'Pricing',
  products: 'Products',
  intelligence: 'Intelligence',
  report: 'Report',
  certification: 'Certification',
  predictions: 'Predictions',
  team: 'Team Dashboard',
  calculator: 'Calculator',
};

export const AutoBreadcrumb: React.FC<{ className?: string }> = ({ className }) => {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs: Array<{ label: string; to: string }> = [];
  let path = '';
  for (const seg of segments) {
    path += `/${seg}`;
    crumbs.push({
      label: ROUTE_LABELS[seg] ?? seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      to: path,
    });
  }

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList
        className="text-[11px] px-4 sm:px-6 py-2"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link
              to="/"
              className="flex items-center gap-1 text-[11px]"
              style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}
            >
              <Home className="w-3 h-3" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <React.Fragment key={crumb.to}>
              <BreadcrumbSeparator
                className="[&>svg]:w-3 [&>svg]:h-3"
                style={{ color: 'rgba(255,255,255,0.18)' }}
              />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage
                    className="text-[11px] font-semibold truncate max-w-[180px]"
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                  >
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link
                      to={crumb.to}
                      className="text-[11px] truncate max-w-[140px]"
                      style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}
                    >
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default AutoBreadcrumb;
