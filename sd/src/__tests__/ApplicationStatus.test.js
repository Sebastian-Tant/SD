import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ApplicationStatus from '../components/ApplicationStatus';
import { auth, db } from '../firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

// --- Mocks ---
jest.mock('../firebase', () => ({
  auth: {
    currentUser: { uid: 'user123' }, // Mock authenticated user
  },
  db: {},
}));

jest.mock('firebase/firestore', () => {
  const query = jest.fn((collection, ...constraints) => ({ collection, constraints }));
  const where = jest.fn((field, operator, value) => ({ field, operator, value }));
  const orderBy = jest.fn((field, direction) => ({ field, direction }));
  const collection = jest.fn((db, path) => ({ path }));
  const getDocs = jest.fn();

  return { collection, getDocs, query, where, orderBy };
});

// --- Test Suite ---
describe('ApplicationStatus Component', () => {
  // Mock data
  const mockApplications = [
    {
      id: 'app1',
      name: 'Gym Membership',
      Facility: 'Main Gym',
      applicationType: 'Membership',
      status: 'pending',
      message: 'Awaiting review',
      submittedAt: { toDate: () => new Date('2025-05-01T10:00:00Z') },
    },
    {
      id: 'app2',
      name: 'Pool Access',
      Facility: 'Swimming Pool',
      applicationType: 'Access',
      status: 'approved',
      message: 'Approved for use',
      submittedAt: '2025-05-02T12:00:00',
    },
    {
      id: 'app3',
      name: 'Yoga Class',
      Facility: 'Yoga Studio',
      applicationType: 'Class',
      status: 'rejected',
      message: 'Class full',
      submittedAt: { toDate: () => new Date('2025-05-03T14:00:00Z') },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Firestore query chain behavior
    collection.mockImplementation((db, path) => ({ path }));
    where.mockImplementation((field, operator, value) => ({ field, operator, value }));
    orderBy.mockImplementation((field, direction) => ({ field, direction }));
    query.mockImplementation((collection, ...constraints) => ({ collection, constraints }));

    // Mock getDocs to resolve with mock applications
    getDocs.mockImplementation(async (queryObj) => {
      expect(queryObj.collection.path).toBe('applications');
      expect(queryObj.constraints).toHaveLength(2);
      expect(queryObj.constraints[0]).toEqual({ field: 'uid', operator: '==', value: 'user123' });
      expect(queryObj.constraints[1]).toEqual({ field: 'submittedAt', direction: 'desc' });

      return {
        docs: mockApplications.map((app) => ({
          id: app.id,
          data: () => ({
            ...app,
            submittedAt: app.submittedAt.toDate ? app.submittedAt.toDate().toLocaleString() : app.submittedAt,
          }),
        })),
      };
    });
  });

  // --- Rendering Tests ---
  it('renders loading state initially', () => {
    render(<ApplicationStatus />);
    expect(screen.getByText('Loading applications…')).toBeInTheDocument();
  });

  it('displays error message when fetching fails', async () => {
    getDocs.mockRejectedValueOnce(new Error('Firestore error'));
    render(<ApplicationStatus />);
    expect(await screen.findByText('Error: Firestore error')).toBeInTheDocument();
  });

  it('displays error when user is not signed in', async () => {
    auth.currentUser = null; // Mock unauthenticated user
    render(<ApplicationStatus />);
    expect(await screen.findByText('Error: Not signed in')).toBeInTheDocument();
  });

  // --- Data Fetching and Display Tests ---
  it('fetches and displays applications by status', async () => {
    render(<ApplicationStatus />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Gym Membership')).toBeInTheDocument();
    });

    // Check headings
    expect(screen.getByRole('heading', { name: 'My Applications' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pending' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Approved' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rejected' })).toBeInTheDocument();

    // Check application items
    expect(screen.getByText('Gym Membership')).toBeInTheDocument();
    expect(screen.getByText('Main Gym')).toBeInTheDocument();
    expect(screen.getByText('Membership')).toBeInTheDocument();
    expect(screen.getByText('Awaiting review')).toBeInTheDocument();
    expect(screen.getByText('pending')).toHaveClass('status pending');

    expect(screen.getByText('Pool Access')).toBeInTheDocument();
    expect(screen.getByText('Swimming Pool')).toBeInTheDocument();
    expect(screen.getByText('Access')).toBeInTheDocument();
    expect(screen.getByText('Approved for use')).toBeInTheDocument();
    expect(screen.getByText('approved')).toHaveClass('status approved');

    expect(screen.getByText('Yoga Class')).toBeInTheDocument();
    expect(screen.getByText('Yoga Studio')).toBeInTheDocument();
    expect(screen.getByText('Class')).toBeInTheDocument();
    expect(screen.getByText('Class full')).toBeInTheDocument();
    expect(screen.getByText('rejected')).toHaveClass('status rejected');
  });

  it('displays "No pending applications" when there are no pending applications', async () => {
    getDocs.mockResolvedValue({
      docs: mockApplications
        .filter((app) => app.status !== 'pending')
        .map((app) => ({
          id: app.id,
          data: () => ({ ...app }),
        })),
    });

    render(<ApplicationStatus />);
    await waitFor(() => {
      expect(screen.getByText('No pending applications.')).toBeInTheDocument();
    });
    expect(screen.getByText('Pool Access')).toBeInTheDocument(); // Approved
    expect(screen.getByText('Yoga Class')).toBeInTheDocument(); // Rejected
  });

  it('displays "No approved applications" when there are no approved applications', async () => {
    getDocs.mockResolvedValue({
      docs: mockApplications
        .filter((app) => app.status !== 'approved')
        .map((app) => ({
          id: app.id,
          data: () => ({ ...app }),
        })),
    });

    render(<ApplicationStatus />);
    await waitFor(() => {
      expect(screen.getByText('No approved applications.')).toBeInTheDocument();
    });
    expect(screen.getByText('Gym Membership')).toBeInTheDocument(); // Pending
    expect(screen.getByText('Yoga Class')).toBeInTheDocument(); // Rejected
  });

  it('displays "No rejected applications" when there are no rejected applications', async () => {
    getDocs.mockResolvedValue({
      docs: mockApplications
        .filter((app) => app.status !== 'rejected')
        .map((app) => ({
          id: app.id,
          data: () => ({ ...app }),
        })),
    });

    render(<ApplicationStatus />);
    await waitFor(() => {
      expect(screen.getByText('No rejected applications.')).toBeInTheDocument();
    });
    expect(screen.getByText('Gym Membership')).toBeInTheDocument(); // Pending
    expect(screen.getByText('Pool Access')).toBeInTheDocument(); // Approved
  });

  it('displays no applications when the list is empty', async () => {
    getDocs.mockResolvedValue({ docs: [] });
    render(<ApplicationStatus />);
    await waitFor(() => {
      expect(screen.getByText('No pending applications.')).toBeInTheDocument();
      expect(screen.getByText('No approved applications.')).toBeInTheDocument();
      expect(screen.getByText('No rejected applications.')).toBeInTheDocument();
    });
  });

  it('handles various date formats for submittedAt', async () => {
  getDocs.mockResolvedValueOnce({
    docs: [
      {
        id: 'app4',
        data: () => ({
          name: 'Test Application',
          Facility: 'Test Facility',
          applicationType: 'Test',
          status: 'pending',
          message: 'Test message',
          submittedAt: '2025-05-10', // Just date string
          uid: 'user123'
        })
      },
      {
        id: 'app5',
        data: () => ({
          name: 'Test Application 2',
          Facility: 'Test Facility',
          applicationType: 'Test',
          status: 'approved',
          message: 'Test message',
          submittedAt: { toDate: () => new Date('invalid') }, // Invalid date
          uid: 'user123'
        })
      }
    ]
  });

  render(<ApplicationStatus />);
  
  await waitFor(() => {
    expect(screen.getByText('2025-05-10')).toBeInTheDocument();
    expect(screen.getByText('Invalid Date')).toBeInTheDocument();
  });
});

it('handles empty or malformed application data', async () => {
  getDocs.mockResolvedValueOnce({
    docs: [
      {
        id: 'app6',
        data: () => ({}) // Empty data
      },
      {
        id: 'app7',
        data: () => ({
          // Missing required fields
          status: 'pending',
          uid: 'user123'
        })
      }
    ]
  });

  render(<ApplicationStatus />);
  
  await waitFor(() => {
    // Should still render without crashing
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });
});

it('correctly filters applications with non-standard status values', async () => {
  getDocs.mockResolvedValueOnce({
    docs: [
      {
        id: 'app8',
        data: () => ({
          name: 'Weird Status',
          Facility: 'Test',
          applicationType: 'Test',
          status: 'in-progress', // Non-standard status
          message: 'Test',
          submittedAt: '2025-05-01',
          uid: 'user123'
        })
      },
      {
        id: 'app9',
        data: () => ({
          name: 'Pending App',
          Facility: 'Test',
          applicationType: 'Test',
          status: 'pending',
          message: 'Test',
          submittedAt: '2025-05-01',
          uid: 'user123'
        })
      }
    ]
  });

  render(<ApplicationStatus />);
  
  await waitFor(() => {
    // Non-standard status should not appear in any section
    expect(screen.queryByText('Weird Status')).not.toBeInTheDocument();
    expect(screen.getByText('Pending App')).toBeInTheDocument();
  });
});

it('renders application item with all expected classes and attributes', async () => {
  render(<ApplicationStatus />);
  
  await waitFor(() => {
    const gymItem = screen.getByText('Gym Membership').closest('li');
    expect(gymItem).toHaveClass('application-item');
    
    const statusTag = screen.getByText('pending');
    expect(statusTag).toHaveClass('application-tag');
    expect(statusTag).toHaveClass('status');
    expect(statusTag).toHaveClass('pending');
    
    expect(screen.getByText('Main Gym')).toHaveClass('facility');
    expect(screen.getByText('Membership')).toHaveClass('type');
    expect(screen.getByText('Awaiting review')).toHaveClass('application-message');
  });
});

it('constructs the Firestore query correctly', async () => {
  render(<ApplicationStatus />);
  
  await waitFor(() => {
    expect(collection).toHaveBeenCalledWith(db, 'applications');
    expect(where).toHaveBeenCalledWith('uid', '==', 'user123');
    expect(orderBy).toHaveBeenCalledWith('submittedAt', 'desc');
    expect(query).toHaveBeenCalled();
  });
});

it('transitions from loading to content correctly', async () => {
  render(<ApplicationStatus />);
  
  // Initial loading state
  expect(screen.getByText('Loading applications…')).toBeInTheDocument();
  
  // Wait for content
  await waitFor(() => {
    expect(screen.queryByText('Loading applications…')).not.toBeInTheDocument();
    expect(screen.getByText('My Applications')).toBeInTheDocument();
  });
});

it('shows error state when subsequent requests fail', async () => {
  // First render successful
  const { rerender } = render(<ApplicationStatus />);
  await waitFor(() => {
    expect(screen.getByText('Gym Membership')).toBeInTheDocument();
  });
  
  // Mock error for next render
  getDocs.mockRejectedValueOnce(new Error('Subsequent error'));
  
  // Force re-render (simulating prop change or similar)
  rerender(<ApplicationStatus />);
  
  await waitFor(() => {
    expect(screen.getByText('Error: Subsequent error')).toBeInTheDocument();
  });
});

describe('ApplicationStatus – filter & renderApplication branches', () => {
  it('renders a `<ul>` for each non‐empty status section and skips the "No…"" messages', async () => {
    // Mock one item in each status
    getDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'p1',
          data: () => ({
            name: 'Pending Item',
            Facility: 'Pending Facility',
            applicationType: 'Type1',
            status: 'pending',
            message: 'Pending Message',
            submittedAt: '2025-05-04',
            uid: 'user123',
          }),
        },
        {
          id: 'a1',
          data: () => ({
            name: 'Approved Item',
            Facility: 'Approved Facility',
            applicationType: 'Type2',
            status: 'approved',
            message: 'Approved Message',
            submittedAt: '2025-05-05',
            uid: 'user123',
          }),
        },
        {
          id: 'r1',
          data: () => ({
            name: 'Rejected Item',
            Facility: 'Rejected Facility',
            applicationType: 'Type3',
            status: 'rejected',
            message: 'Rejected Message',
            submittedAt: '2025-05-06',
            uid: 'user123',
          }),
        },
      ],
    });

    render(<ApplicationStatus />);
    await waitFor(() => {
      // None of the "No … applications." messages should be present
      expect(screen.queryByText('No pending applications.')).toBeNull();
      expect(screen.queryByText('No approved applications.')).toBeNull();
      expect(screen.queryByText('No rejected applications.')).toBeNull();

      // Each item is rendered in its respective section
      expect(screen.getByText('Pending Item')).toBeInTheDocument();
      expect(screen.getByText('Approved Item')).toBeInTheDocument();
      expect(screen.getByText('Rejected Item')).toBeInTheDocument();
    });
  });

  it('uses the correct classes and structure inside `renderApplication`', async () => {
    // Mock a single pending item to inspect its markup
    getDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'x1',
          data: () => ({
            name: 'XItem',
            Facility: 'XFacility',
            applicationType: 'XType',
            status: 'pending',
            message: 'XMessage',
            submittedAt: '2025-05-07',
            uid: 'user123',
          }),
        },
      ],
    });

    render(<ApplicationStatus />);
    await waitFor(() => {
      // Find the <li> wrapper
      const item = screen.getByText('XItem').closest('li');
      expect(item).toHaveClass('application-item');

      // Facility tag
      const facilityTag = screen.getByText('XFacility');
      expect(facilityTag).toHaveClass('application-tag', 'facility');

      // Type tag
      const typeTag = screen.getByText('XType');
      expect(typeTag).toHaveClass('application-tag', 'type');

      // Date tag
      const dateTag = screen.getByText('2025-05-07');
      expect(dateTag).toHaveClass('application-tag', 'date');

      // Status tag
      const statusTag = screen.getByText('pending');
      expect(statusTag).toHaveClass('application-tag', 'status', 'pending');

      // Message paragraph
      const message = screen.getByText('XMessage');
      expect(message).toHaveClass('application-message');
    });
  });
});


  it('correctly formats submittedAt dates', async () => {
    render(<ApplicationStatus />);
    await waitFor(() => {
      expect(screen.getByText('Gym Membership')).toBeInTheDocument();
    });

    // Check formatted date for Timestamp (mocked to 2025-05-01T10:00:00Z)
    expect(screen.getByText(/May 1, 2025/)).toBeInTheDocument(); // Adjust based on locale
    // Check pre-formatted string date
    expect(screen.getByText('2025-05-02T12:00:00')).toBeInTheDocument();
  });


  
// helper to build a fake Firestore doc
const makeDoc = ({ id, name, Facility, applicationType, status, message, submittedAt }) => ({
  id,
  data: () => ({ name, Facility, applicationType, status, message, submittedAt, uid: 'user123' })
});

describe('directly hitting each filter branch in isolation', () => {
  ['pending', 'approved', 'rejected'].forEach((status) => {
    it(`only renders the ${status} <ul> when there is exactly one ${status} app`, async () => {
      // mock Firestore to return exactly one doc with that status
      getDocs.mockResolvedValueOnce({
        docs: [ makeDoc({
          id: `${status}1`,
          name: `${status.charAt(0).toUpperCase()+status.slice(1)} Only`,
          Facility: 'F', applicationType: 'T',
          status,
          message: 'M',
          submittedAt: '2025-05-08'
        }) ]
      });
  
      render(<ApplicationStatus />);
      // wait for the single‐app to appear
      await waitFor(() =>
        expect(
          screen.getByText(`${status.charAt(0).toUpperCase()+status.slice(1)} Only`)
        ).toBeInTheDocument()
      );
  
      // That section should have a <ul> with one <li>
      const section = screen
        .getByRole('heading', { name: status.charAt(0).toUpperCase()+status.slice(1) })
        .closest('section');
      expect(section.querySelectorAll('ul').length).toBe(1);
      expect(section.querySelectorAll('li').length).toBe(1);
  
      // The other two sections should show the "No … applications." fallback
      ['pending','approved','rejected']
        .filter((s) => s !== status)
        .forEach((s) => {
          expect(
            screen.getByText(new RegExp(`No ${s} applications\\.`, 'i'))
          ).toBeInTheDocument();
        });
    });
  });
});

it('renders the <span.application-name> and wrapper <div.application-tags> correctly', async () => {
  // pick “pending” for simplicity
  getDocs.mockResolvedValueOnce({
    docs: [ makeDoc({
      id: 'p1',
      name: 'NameSpanTest',
      Facility: 'FacTest',
      applicationType: 'TypeTest',
      status: 'pending',
      message: 'MsgTest',
      submittedAt: '2025-05-09'
    }) ]
  });

  render(<ApplicationStatus />);
  // wait for it to finish loading
  await waitFor(() =>
    expect(screen.getByText('NameSpanTest')).toBeInTheDocument()
  );

  // application-name
  const nameSpan = screen.getByText('NameSpanTest');
  expect(nameSpan.tagName).toBe('SPAN');
  expect(nameSpan).toHaveClass('application-name');

  // application-tags container
  const tagsDiv = nameSpan.nextSibling;
  expect(tagsDiv.tagName).toBe('DIV');
  expect(tagsDiv).toHaveClass('application-tags');

  // and inside it the four <span.application-tag …> in order
  const spans = Array.from(tagsDiv.querySelectorAll('span.application-tag'));
  expect(spans).toHaveLength(4);
  expect(spans[0]).toHaveClass('facility');
  expect(spans[1]).toHaveClass('type');
  expect(spans[2]).toHaveClass('date');
  expect(spans[3]).toHaveClass('status', 'pending');
});

// Finally, one more smoke‐test to force the code past the arrow‐function close (line 71)
it('falls through to the final <div.application-status-container> when all sections non-empty', async () => {
  getDocs.mockResolvedValueOnce({
    docs: [
      makeDoc({ id: 'p', name: 'P', Facility: 'F1', applicationType: 'T1', status: 'pending', message: 'M1', submittedAt: '2025-05-10' }),
      makeDoc({ id: 'a', name: 'A', Facility: 'F2', applicationType: 'T2', status: 'approved', message: 'M2', submittedAt: '2025-05-11' }),
      makeDoc({ id: 'r', name: 'R', Facility: 'F3', applicationType: 'T3', status: 'rejected', message: 'M3', submittedAt: '2025-05-12' }),
    ]
  });

  const { container } = render(<ApplicationStatus />);
  await waitFor(() =>
    expect(screen.getByText('P')).toBeInTheDocument()
  );
  // ensure the outer wrapper is rendered
  const wrapper = container.querySelector('div.application-status-container');
  expect(wrapper).toBeTruthy();
});

});