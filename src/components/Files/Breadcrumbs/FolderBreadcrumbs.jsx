"use client";

import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/**
 * Folder breadcrumbs navigation component
 * Displays the current folder path with clickable navigation
 *
 * @param {Object} props
 * @param {Array} props.breadcrumbs - Array of breadcrumb objects [{id, nome, path}]
 * @param {Function} props.onNavigate - Callback when clicking a breadcrumb
 */
export default function FolderBreadcrumbs({ breadcrumbs = [], onNavigate }) {
  if (!breadcrumbs || breadcrumbs.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span>Root</span>
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Root folder */}
        <BreadcrumbItem>
          <BreadcrumbLink
            onClick={() => onNavigate(null)}
            className="flex items-center gap-1 cursor-pointer hover:text-foreground"
          >
            <Home className="h-4 w-4" />
            <span>Root</span>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <div key={crumb.id} className="flex items-center">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.nome}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    onClick={() => onNavigate(crumb.id)}
                    className="cursor-pointer hover:text-foreground"
                  >
                    {crumb.nome}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
