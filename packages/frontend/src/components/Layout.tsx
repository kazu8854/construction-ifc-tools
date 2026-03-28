import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import AppLayout from '@cloudscape-design/components/app-layout';
import TopNavigation from '@cloudscape-design/components/top-navigation';
import SideNavigation from '@cloudscape-design/components/side-navigation';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const { user, login, logout, isMock } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      <div id="h" style={{ position: 'sticky', top: 0, zIndex: 1002 }}>
        <TopNavigation
          identity={{ href: '/', title: 'Construction IFC Tools' }}
          utilities={[
            { type: 'button', text: isMock ? 'Mock Mode' : 'AWS Mode', iconName: 'settings' },
            user
              ? {
                  type: 'menu-dropdown', text: user.name, iconName: 'user-profile',
                  items: [{ id: 'signout', text: 'Sign out' }],
                  onItemClick: (e: any) => { if (e.detail.id === 'signout') logout(); },
                }
              : { type: 'button', text: 'Sign in', onClick: () => login() },
          ]}
        />
      </div>
      <AppLayout
        toolsHide
        navigation={
          <SideNavigation
            activeHref={location.pathname}
            onFollow={(event: any) => {
              if (!event.detail.external) { event.preventDefault(); navigate(event.detail.href); }
            }}
            header={{ text: 'Navigation', href: '/' }}
            items={[
              { type: 'link', text: 'Dashboard', href: '/' },
              { type: 'divider' },
              { type: 'section', text: 'IFC Management', items: [
                { type: 'link', text: 'File Manager', href: '/files' },
                { type: 'link', text: '3D Viewer', href: '/viewer' },
              ]},
              { type: 'divider' },
              { type: 'section', text: 'AI Features', items: [
                { type: 'link', text: 'AI IFC Generation', href: '/ai-generate' },
                { type: 'link', text: 'Graph Q&A', href: '/graph-qa' },
              ]},
            ]}
          />
        }
        content={<Outlet />}
      />
    </>
  );
}
