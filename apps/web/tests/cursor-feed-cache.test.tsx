import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClient } from '../src/services/api.js';
import { useCursorFeed } from '../src/hooks/useCursorFeed.js';

const FeedHarness: React.FC = () => {
  const navigate = useNavigate();
  const { posts, fetchNextPage, hasNextPage } = useCursorFeed({
    queryKey: ['feed'],
    limit: 2,
    buildUrl: (olderId) => `/publications${olderId ? `?older_id=${olderId}` : ''}`,
  });
  return (
    <div>
      {posts.map((p) => <div key={p.id}>{p.content}</div>)}
      {hasNextPage && <button onClick={() => fetchNextPage()}>More</button>}
      <button onClick={() => navigate('/publication/p1')}>Open</button>
    </div>
  );
};

const DetailMock: React.FC = () => {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Back</button>;
};

describe('Paginated Feed Cache Retention Across Back Navigation', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('keeps all loaded pages cached without re-fetching when navigating back from a publication detail', async () => {
    const getSpy = vi.spyOn(ApiClient, 'get')
      .mockResolvedValueOnce({ success: true, data: [{ id: 'p1', content: 'Post One' }, { id: 'p2', content: 'Post Two' }] })
      .mockResolvedValueOnce({ success: true, data: [{ id: 'p3', content: 'Post Three' }] });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<FeedHarness />} />
            <Route path="/publication/:id" element={<DetailMock />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText('Post One')).toBeInTheDocument());
    fireEvent.click(screen.getByText('More'));
    await waitFor(() => expect(screen.getByText('Post Three')).toBeInTheDocument());
    expect(getSpy).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByText('Open'));
    fireEvent.click(screen.getByText('Back'));

    expect(screen.getByText('Post One')).toBeInTheDocument();
    expect(screen.getByText('Post Two')).toBeInTheDocument();
    expect(screen.getByText('Post Three')).toBeInTheDocument();
    expect(getSpy).toHaveBeenCalledTimes(2);
  });
});

