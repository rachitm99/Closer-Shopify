import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppProvider } from '@shopify/polaris';
import Home from '../pages/index';
import enTranslations from '@shopify/polaris/locales/en.json';

// Mock fetch
global.fetch = jest.fn();

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    query: { shop: 'test-shop.myshopify.com' },
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider i18n={enTranslations}>{children}</AppProvider>
);

describe('Home Page - Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the settings page', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ enabled: false }),
    });

    render(<Home />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Reward Message Settings')).toBeInTheDocument();
    });
  });

  it('loads and displays current setting', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ enabled: true }),
    });

    render(<Home />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/currently/)).toHaveTextContent('enabled');
    });
  });

  it('toggles the reward message setting', async () => {
    // Initial load
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ enabled: false }),
    });

    render(<Home />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/currently/)).toHaveTextContent('disabled');
    });

    // Mock the update request
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, enabled: true }),
    });

    // Click the enable button
    const enableButton = screen.getByText('Enable');
    fireEvent.click(enableButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: true }),
      });
    });
  });

  it('displays error when API fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Failed to load settings')
    );

    render(<Home />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Failed to load settings/)).toBeInTheDocument();
    });
  });

  it('shows preview of reward message', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ enabled: false }),
    });

    render(<Home />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('🎉 Congratulations!')).toBeInTheDocument();
      expect(screen.getByText('You have won a reward!')).toBeInTheDocument();
    });
  });
});
