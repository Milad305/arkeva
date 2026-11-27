import { configureStore } from '@reduxjs/toolkit';
import { cleanup, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { authReducer } from '@/app/store/authSlice';
import { Sidebar, type SidebarCounts } from './Sidebar';

const ORG = { name: 'شرکت نمونه', initials: 'ش.ن', activeProjectCount: 5 };
const USER = { fullName: 'مهندس احمدی', initials: 'م.ا', jobTitle: 'مدیر پروژه', avatarTone: 'a1' };

function renderSidebar(route: string, counts?: SidebarCounts) {
  const store = configureStore({ reducer: { auth: authReducer } });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <Sidebar organization={ORG} user={USER} counts={counts} />
      </MemoryRouter>
    </Provider>,
  );
}

afterEach(cleanup);

describe('Sidebar', () => {
  it('renders live badge counts and hides badges when undefined or zero', () => {
    const { container } = renderSidebar('/dashboard', { projects: 13, reports: 0, risks: 4 });
    const badges = Array.from(container.querySelectorAll('.cnt')).map((el) => el.textContent);
    expect(badges).toEqual(['۱۳', '۴']);
    expect(container.textContent).not.toContain('۱۲');
    expect(container.textContent).not.toContain('۲۴');
    expect(container.textContent).not.toContain('۹');
  });

  it('renders no badges when counts are not loaded yet', () => {
    const { container } = renderSidebar('/dashboard');
    expect(container.querySelectorAll('.cnt')).toHaveLength(0);
  });

  it('activates only WBS/CBS structure on /templates and does not activate settings', () => {
    renderSidebar('/templates');
    const structureLink = screen.getByRole('link', { name: 'ساختار WBS / CBS' });
    const settingsLink = screen.getByRole('link', { name: 'تنظیمات' });

    expect(structureLink.className).toContain('on');
    expect(settingsLink.className).not.toContain('on');
    expect(settingsLink.getAttribute('href')).toBe('/account');
  });

  it('routes settings to project settings inside a project and activates it on settings route', () => {
    renderSidebar('/projects/prj-123/settings');
    const settingsLink = screen.getByRole('link', { name: 'تنظیمات' });
    const structureLink = screen.getByRole('link', { name: 'ساختار WBS / CBS' });

    expect(settingsLink.getAttribute('href')).toBe('/projects/prj-123/settings');
    expect(settingsLink.className).toContain('on');
    expect(structureLink.className).not.toContain('on');
  });
});
