"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { LogoutButton } from "./logout-button";

export type SidebarNavigationItem = {
  name: string;
  href: string;
  icon: string;
};

type SidebarProps = {
  tenantName: string;
  navigation: SidebarNavigationItem[];
};

export function Sidebar({
  tenantName,
  navigation,
}: SidebarProps) {
  const [open, setOpen] =
    useState(false);

  const pathname = usePathname();

  function closeMenu() {
    setOpen(false);
  }

  return (
    <>
      {/* Barra superior mobile */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md p-2 text-slate-700 hover:bg-slate-100"
          aria-label="Abrir menu"
          aria-expanded={open}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">
            B
          </div>

          <span className="font-semibold text-slate-900">
            Balaio
          </span>
        </div>

        <div className="w-9" />
      </div>

      {/* Fundo do menu mobile */}
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-slate-900/50 lg:hidden"
          onClick={closeMenu}
          aria-label="Fechar menu"
        />
      )}

      {/* Menu lateral */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200",
          "lg:translate-x-0",
          open
            ? "translate-x-0"
            : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">
              B
            </div>

            <div className="min-w-0">
              <p className="font-semibold text-slate-900">
                Balaio
              </p>

              <p
                className="truncate text-xs text-slate-500"
                title={tenantName}
              >
                {tenantName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeMenu}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Fechar menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navigation.length === 0 ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-600">
                Nenhuma página disponível para
                este usuário.
              </p>
            </div>
          ) : (
            navigation.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname ===
                      item.href ||
                    pathname.startsWith(
                      `${item.href}/`,
                    );

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-700 hover:bg-slate-100",
                  )}
                >
                  <span
                    className="text-base"
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>

                  <span>
                    {item.name}
                  </span>
                </Link>
              );
            })
          )}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}