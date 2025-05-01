// Global variables
const API_URL = 'https://thehinduproject.onrender.com/api'; // Change this to your actual API URL
let currentUser = null;
let isAdmin = false;

// DOM elements
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menu-toggle');
const sidebarClose = document.getElementById('sidebar-close');
const content = document.getElementById('content');
const notification = document.getElementById('notification');
const logoutButton = document.getElementById('logout-button');

// Check if user is logged in
function checkAuth() {
  const token = localStorage.getItem('token');
  if (token) {
    const userData = JSON.parse(localStorage.getItem('user'));
    currentUser = userData;
    isAdmin = userData.isAdmin;
    
    // Update UI based on auth state
    document.querySelectorAll('.auth-only').forEach(el => el.style.display = 'block');
    document.querySelectorAll('.no-auth-only').forEach(el => el.style.display = 'none');
    
    if (isAdmin) {
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
    } else {
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
  } else {
    // User is not logged in
    currentUser = null;
    isAdmin = false;
    
    document.querySelectorAll('.auth-only').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.no-auth-only').forEach(el => el.style.display = 'block');
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  }
}

// API request helper
async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options = {
    method,
    headers
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    
    if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      checkAuth();
      showNotification('Session expired. Please login again.', 'error');
      navigateTo('login');
      return null;
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }
    
    return data;
  } catch (error) {
    console.error('API request error:', error);
    showNotification(error.message, 'error');
    return null;
  }
}

// Show notification
function showNotification(message, type = 'success') {
  notification.textContent = message;
  notification.className = `notification notification-${type} show`;
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Navigation
function navigateTo(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.style.display = 'none';
  });
  
  // Show the selected page
  const selectedPage = document.getElementById(`${pageId}-page`);
  if (selectedPage) {
    selectedPage.style.display = 'block';
  }
  
  // Update active menu item
  document.querySelectorAll('.sidebar-menu a').forEach(link => {
    link.classList.remove('active');
  });
  
  const activeLink = document.querySelector(`.sidebar-menu a[data-page="${pageId}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }
  
  // Close sidebar on mobile
  if (window.innerWidth < 768) {
    sidebar.classList.remove('open');
  }
  
  // Load page content
  switch (pageId) {
    case 'home':
      loadPosts();
      break;
    case 'events':
      loadEvents();
      break;
    case 'chat':
      loadChat();
      break;
    case 'profile':
      loadProfile();
      break;
      // Add loadAdminPosts to the navigateTo function where it loads admin panel
// Add this case to the switch statement in navigateTo function:
    case 'admin':
     if (isAdmin) {
     loadAdminPosts();
  }
     break;
  // Update navigateTo function to handle the single post page
// Add this case to the switch statement in the navigateTo function
     case 'single-post':
  // Nothing special needed, just show the page
     break;
  }
}

// Load posts for home page
async function loadPosts() {
  const postsContainer = document.getElementById('posts-container');
  postsContainer.innerHTML = '<div class="loading">Loading posts...</div>';
  
  const posts = await apiRequest('/posts');
  
  if (posts && posts.length > 0) {
    postsContainer.innerHTML = '';
    
    posts.forEach(post => {
      const postEl = document.createElement('div');
      postEl.className = 'post-card';
      
      // Update this part in the loadPosts function
      let postHtml =`
      <div class="post-header">
          <h3 class="post-title">${post.title}</h3>
          <div class="post-meta">
            <span class="post-author">By ${post.username}</span>
            <span class="post-date">${new Date(post.created_at).toLocaleDateString()}</span>
            ${isAdmin ? `<button class="delete-post-btn" data-post-id="${post.id}"><i class="fas fa-trash"></i></button>` : ''}
          </div>
        </div>
        <div class="post-content">
      `;;
      
      if (post.image_url) {
        postHtml += `<img src="${post.image_url}" alt="${post.title}" class="post-image">`;
      }
      
      postHtml += `
          <div class="post-text">${post.content}</div>
        </div>
        <div class="post-footer">
          <div class="comment-section">
            <h4>Comments</h4>
            <div class="post-comments" id="comments-${post.id}">
              <div class="loading">Loading comments...</div>
            </div>
            ${currentUser ? `
              <form class="comment-form" data-post-id="${post.id}">
                <textarea placeholder="Add a comment..." required></textarea>
                <button type="submit"><i class="fas fa-paper-plane"></i></button>
              </form>
            ` : `
              <div class="chat-login-prompt">
                <p>Please <a href="#" data-page="login">login</a> to comment</p>
              </div>
            `}
          </div>
        </div>
      `;
      
      postEl.innerHTML = postHtml;
      postsContainer.appendChild(postEl);
      
      // Load comments for this post
      loadComments(post.id);
      
      // Add event listener for comment form
      if (currentUser) {
        const commentForm = postEl.querySelector('.comment-form');
        commentForm.addEventListener('submit', function(e) {
          e.preventDefault();
          const postId = this.getAttribute('data-post-id');
          const content = this.querySelector('textarea').value;
          addComment(postId, content, this);
        });
      }
    });
  } else {
    postsContainer.innerHTML = '<div class="no-posts">No posts yet.</div>';
  }
}






// Add these functions to javascript-code.js

// Global variable to store posts data
let postsData = [];

// Modified loadPosts function to make posts clickable
async function loadPosts() {
  const postsContainer = document.getElementById('posts-container');
  postsContainer.innerHTML = '<div class="loading">Loading posts...</div>';
  
  const posts = await apiRequest('/posts');
  
  if (posts && posts.length > 0) {
    // Store posts data for later use
    postsData = posts;
    
    postsContainer.innerHTML = '';
    
    posts.forEach(post => {
      const postEl = document.createElement('div');
      postEl.className = 'post-card';
      postEl.setAttribute('data-post-id', post.id);
      
      // Create a preview of the content (first 200 chars)
      const contentPreview = post.content.length > 200 
        ? post.content.substring(0, 200) + '...' 
        : post.content;
      
      let postHtml = `
        <div class="post-header">
          <h3 class="post-title">${post.title}</h3>
          <div class="post-meta">
            <span class="post-author">By ${post.username}</span>
            <span class="post-date">${new Date(post.created_at).toLocaleDateString()}</span>
            ${isAdmin ? `<button class="delete-post-btn" data-post-id="${post.id}"><i class="fas fa-trash"></i></button>` : ''}
          </div>
        </div>
        <div class="post-content">
      `;
      
      if (post.image_url) {
        postHtml += `<img src="${post.image_url}" alt="${post.title}" class="post-image">`;
      }
      
      postHtml += `
          <div class="post-text">${contentPreview}</div>
          <button class="read-more-btn">Read More</button>
        </div>
      `;
      
      postEl.innerHTML = postHtml;
      postsContainer.appendChild(postEl);
      
      // Add event listener for post click
      postEl.addEventListener('click', function(e) {
        // Don't navigate if clicking on delete button
        if (e.target.closest('.delete-post-btn')) {
          return;
        }
        
        const postId = this.getAttribute('data-post-id');
        openSinglePost(postId);
      });
      
      // Add event listener for delete button if admin
      if (isAdmin) {
        const deleteBtn = postEl.querySelector('.delete-post-btn');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const postId = this.getAttribute('data-post-id');
            deletePost(postId);
          });
        }
      }
    });
  } else {
    postsContainer.innerHTML = '<div class="no-posts">No posts yet.</div>';
  }
}

// Function to open a single post
function openSinglePost(postId) {
  // Find the post in stored data
  const post = postsData.find(p => p.id === parseInt(postId));
  
  if (!post) {
    showNotification('Post not found', 'error');
    return;
  }
  
  const singlePostContainer = document.getElementById('single-post-container');
  
  // Format the content with proper paragraphs
  const formattedContent = formatPostContent(post.content);
  
  let postHtml = `
    <div class="single-post">
      <div class="post-header">
        <h2 class="post-title">${post.title}</h2>
        <div class="post-meta">
          <span class="post-author">By ${post.username}</span>
          <span class="post-date">${new Date(post.created_at).toLocaleDateString()}</span>
          ${isAdmin ? `<button class="delete-post-btn" data-post-id="${post.id}"><i class="fas fa-trash"></i></button>` : ''}
        </div>
      </div>
      <div class="post-content">
  `;
  
  if (post.image_url) {
    postHtml += `<img src="${post.image_url}" alt="${post.title}" class="post-image post-image-large">`;
  }
  
  postHtml += `
        <div class="post-text">${formattedContent}</div>
      </div>
      <div class="post-footer">
        <div class="comment-section">
          <h4>Comments</h4>
          <div class="post-comments" id="comments-${post.id}">
            <div class="loading">Loading comments...</div>
          </div>
          ${currentUser ? `
            <form class="comment-form" data-post-id="${post.id}">
              <textarea placeholder="Add a comment..." required></textarea>
              <button type="submit"><i class="fas fa-paper-plane"></i></button>
            </form>
          ` : `
            <div class="chat-login-prompt">
              <p>Please <a href="#" data-page="login">login</a> to comment</p>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
  
  singlePostContainer.innerHTML = postHtml;
  
  // Add event listener for delete button if admin
  if (isAdmin) {
    const deleteBtn = singlePostContainer.querySelector('.delete-post-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const postId = this.getAttribute('data-post-id');
        deletePost(postId);
        navigateTo('home'); // Go back to home after deleting
      });
    }
  }
  
  // Add event listener for comment form
  if (currentUser) {
    const commentForm = singlePostContainer.querySelector('.comment-form');
    commentForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const postId = this.getAttribute('data-post-id');
      const content = this.querySelector('textarea').value;
      addComment(postId, content, this);
    });
  }
  
  // Load comments for this post
  loadComments(post.id);
  
  // Navigate to the single post page
  navigateTo('single-post');
}

// Function to format post content with proper paragraphs and sanitize HTML
function formatPostContent(content) {
  // First, ensure content is a string
  if (typeof content !== 'string') {
    return '';
  }
  
  // Sanitize HTML (basic implementation - for production use a proper sanitizer library)
  let sanitized = content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Convert line breaks to paragraphs
  let formatted = sanitized
    .split('\n\n')
    .filter(para => para.trim() !== '')
    .map(para => `<p>${para.trim()}</p>`)
    .join('');
  
  // Handle single line breaks within paragraphs
  formatted = formatted.replace(/\n/g, '<br>');
  
  return formatted;
}

// Add event listener for the back button
document.addEventListener('DOMContentLoaded', () => {
  // ...existing code...
  
  // Back button on single post page
  const backButton = document.getElementById('back-to-posts');
  if (backButton) {
    backButton.addEventListener('click', () => {
      navigateTo('home');
    });
  }
});


// Load comments for a post
async function loadComments(postId) {
  const commentsContainer = document.getElementById(`comments-${postId}`);
  
  const comments = await apiRequest(`/posts/${postId}/comments`);
  
  if (comments && comments.length > 0) {
    commentsContainer.innerHTML = '';
    
    comments.forEach(comment => {
      const commentEl = document.createElement('div');
      commentEl.className = 'comment';
      commentEl.innerHTML = `
        <div class="comment-meta">
          <span class="comment-author">${comment.username}</span>
          <span class="comment-date">${new Date(comment.created_at).toLocaleDateString()}</span>
        </div>
        <div class="comment-content">${comment.content}</div>
      `;
      commentsContainer.appendChild(commentEl);
    });
  } else {
    commentsContainer.innerHTML = '<div class="no-comments">No comments yet.</div>';
  }
}

// Add a comment to a post
async function addComment(postId, content, form) {
  const result = await apiRequest(`/posts/${postId}/comments`, 'POST', { content });
  
  if (result) {
    // Clear the form
    form.querySelector('textarea').value = '';
    
    // Reload comments
    loadComments(postId);
    
    showNotification('Comment added successfully');
  }
}

// Delete a post (admin only)
async function deletePost(postId) {
  if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
    return;
  }
  
  const result = await apiRequest(`/posts/${postId}`, 'DELETE');
  
  if (result) {
    // Reload posts
    loadPosts();
    showNotification('Post deleted successfully');
  }
}

// Load events
async function loadEvents() {
  const eventsContainer = document.getElementById('events-container');
  eventsContainer.innerHTML = '<div class="loading">Loading events...</div>';
  
  const events = await apiRequest('/events');
  
  if (events && events.length > 0) {
    eventsContainer.innerHTML = '';
    
    events.forEach(event => {
      const eventDate = new Date(event.event_date);
      
      const eventEl = document.createElement('div');
      eventEl.className = 'event-card';
      eventEl.innerHTML = `
        <div class="event-header">
          <h3 class="event-title">${event.title}</h3>
          <div class="event-meta">
            <div class="event-date">
              <i class="fas fa-calendar-alt"></i>
              ${eventDate.toLocaleDateString()} at ${eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div class="event-location">
              <i class="fas fa-map-marker-alt"></i>
              ${event.location}
            </div>
          </div>
        </div>
        <div class="event-content">
          <div class="event-description">${event.description}</div>
        </div>
        <div class="event-footer">
          <div class="event-organizer">Organized by ${event.username}</div>
          ${currentUser ? `
            <div class="event-actions" data-event-id="${event.id}">
              <button class="btn-going">Going</button>
              <button class="btn-maybe">Maybe</button>
              <button class="btn-not-going">Not Going</button>
            </div>
          ` : ''}
        </div>
      `;
      
      eventsContainer.appendChild(eventEl);
      
      // Add event listeners for RSVP buttons
      if (currentUser) {
        const eventActions = eventEl.querySelector('.event-actions');
        const eventId = eventActions.getAttribute('data-event-id');
        
        const goingBtn = eventActions.querySelector('.btn-going');
        const maybeBtn = eventActions.querySelector('.btn-maybe');
        const notGoingBtn = eventActions.querySelector('.btn-not-going');
        
        goingBtn.addEventListener('click', () => {
          handleRSVP(eventId, 'going', [goingBtn, maybeBtn, notGoingBtn]);
        });
        
        maybeBtn.addEventListener('click', () => {
          handleRSVP(eventId, 'maybe', [goingBtn, maybeBtn, notGoingBtn]);
        });
        
        notGoingBtn.addEventListener('click', () => {
          handleRSVP(eventId, 'not_going', [goingBtn, maybeBtn, notGoingBtn]);
        });
      }
    });
  } else {
    eventsContainer.innerHTML = '<div class="no-events">No events scheduled yet.</div>';
  }
}

// Handle RSVP button click
async function handleRSVP(eventId, status, buttons) {
  const result = await apiRequest(`/events/${eventId}/rsvp`, 'POST', { status });
  
  if (result) {
    // Update button states
    buttons.forEach(btn => {
      btn.classList.remove('btn-active');
      btn.classList.add('btn-inactive');
    });
    
    // Activate the selected button
    const activeBtn = buttons.find(btn => btn.className.includes(status.replace('_', '-')));
    if (activeBtn) {
      activeBtn.classList.remove('btn-inactive');
      activeBtn.classList.add('btn-active');
    }
    
    showNotification('RSVP updated successfully');
  }
}

// Load chat messages
async function loadChat() {
  if (!currentUser) return;
  
  const chatMessages = document.getElementById('chat-messages');
  chatMessages.innerHTML = '<div class="loading">Loading messages...</div>';
  
  const messages = await apiRequest('/chat');
  
  if (messages && messages.length > 0) {
    chatMessages.innerHTML = '';
    
    messages.forEach(message => {
      const messageEl = document.createElement('div');
      messageEl.className = `message ${message.user_id === currentUser.id ? 'message-mine' : 'message-other'}`;
      messageEl.innerHTML = `
        <div class="message-content">${message.content}</div>
        <div class="message-meta">
          <span class="message-author">${message.username}</span>
          <span class="message-time">${new Date(message.created_at).toLocaleTimeString()}</span>
        </div>
      `;
      chatMessages.appendChild(messageEl);
    });
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } else {
    chatMessages.innerHTML = '<div class="no-messages">No messages yet. Start the conversation!</div>';
  }
  
  // Add event listener for send message button
  const sendMessageBtn = document.getElementById('send-message');
  const messageInput = document.getElementById('chat-message');
  
  sendMessageBtn.addEventListener('click', () => {
    const content = messageInput.value.trim();
    if (content) {
      sendMessage(content);
    }
  });
  
  // Send message on Enter key
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const content = messageInput.value.trim();
      if (content) {
        sendMessage(content);
      }
    }
  });
}

// Send a chat message
async function sendMessage(content) {
  const result = await apiRequest('/chat', 'POST', { content });
  
  if (result) {
    // Clear input
    document.getElementById('chat-message').value = '';
    
    // Reload chat messages
    loadChat();
  }
}

// Load user profile
function loadProfile() {
  if (!currentUser) {
    navigateTo('login');
    return;
  }
  
  const profileInfo = document.getElementById('profile-info');
  
  profileInfo.innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar">
        ${currentUser.username.charAt(0).toUpperCase()}
      </div>
      <div>
        <h3 class="profile-name">${currentUser.fullName}</h3>
        <div class="profile-username">@${currentUser.username}</div>
      </div>
    </div>
    <div class="profile-details">
      <div>
        <h3>Email</h3>
        <p>${currentUser.email}</p>
      </div>
      <div>
        <h3>Role</h3>
        <p>${currentUser.isAdmin ? 'Administrator' : 'Member'}</p>
      </div>
    </div>
  `;
}

// Event listeners for sidebar toggle
menuToggle.addEventListener('click', () => {
  sidebar.classList.add('open');
});

sidebarClose.addEventListener('click', () => {
  sidebar.classList.remove('open');
});

// Event delegation for navigation links
document.addEventListener('click', (e) => {
  if (e.target.tagName === 'A' && e.target.hasAttribute('data-page')) {
    e.preventDefault();
    const pageId = e.target.getAttribute('data-page');
    navigateTo(pageId);
  }
});

// Logout button
logoutButton.addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  checkAuth();
  navigateTo('home');
  showNotification('Logged out successfully');
});

// Form event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Login form
  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    const result = await apiRequest('/login', 'POST', { email, password });
    
    if (result && result.token) {
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      
      checkAuth();
      navigateTo('home');
      showNotification('Login successful');
    }
  });
  
  // Register form
  const registerForm = document.getElementById('register-form');
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const fullName = document.getElementById('register-fullname').value;
    const location = document.getElementById('register-location').value;
    const phone = document.getElementById('register-phone').value;
    const skills = document.getElementById('register-skills').value;
    
    const result = await apiRequest('/register', 'POST', {
      username,
      email,
      password,
      fullName,
      location,
      phone,
      skills
    });
    
    if (result) {
      navigateTo('login');
      showNotification('Registration successful. Please login.');
    }
  });
  
  // Create post form (admin only)
  const createPostForm = document.getElementById('create-post-form');
  if (createPostForm) {
    createPostForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const title = document.getElementById('post-title').value;
      const content = document.getElementById('post-content').value;
      const imageUrl = document.getElementById('post-image').value;
      
      const result = await apiRequest('/posts', 'POST', {
        title,
        content,
        imageUrl
      });
      
      if (result) {
        // Clear form
        document.getElementById('post-title').value = '';
        document.getElementById('post-content').value = '';
        document.getElementById('post-image').value = '';
        
        navigateTo('home');
        showNotification('Post created successfully');
      }
    });
  }

  // Add event listener for delete button if admin
if (isAdmin) {
  const deleteBtn = postEl.querySelector('.delete-post-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const postId = this.getAttribute('data-post-id');
      deletePost(postId);
    });
  }
}
  
  // Create event form (admin only)
  const createEventForm = document.getElementById('create-event-form');
  if (createEventForm) {
    createEventForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const title = document.getElementById('event-title').value;
      const description = document.getElementById('event-description').value;
      const location = document.getElementById('event-location').value;
      const eventDate = document.getElementById('event-date').value;
      
      const result = await apiRequest('/events', 'POST', {
        title,
        description,
        location,
        eventDate
      });
      
      if (result) {
        // Clear form
        document.getElementById('event-title').value = '';
        document.getElementById('event-description').value = '';
        document.getElementById('event-location').value = '';
        document.getElementById('event-date').value = '';
        
        navigateTo('events');
        showNotification('Event created successfully');
      }
    });
  }
});





// Also, add a button to the admin panel to see all posts and delete them
// Add this to the admin-page section in the HTML file

// Add this to the admin panel in HTML:
/*
<div class="admin-section">
  <h3>Manage Posts</h3>
  <div class="admin-posts" id="admin-posts">
    <div class="loading">Loading posts...</div>
  </div>
</div>
*/

// Add this function to load posts in admin panel
function loadAdminPosts() {
  if (!isAdmin) return;
  
  const adminPostsContainer = document.getElementById('admin-posts');
  if (!adminPostsContainer) return;
  
  adminPostsContainer.innerHTML = '<div class="loading">Loading posts...</div>';
  
  apiRequest('/posts').then(posts => {
    if (posts && posts.length > 0) {
      adminPostsContainer.innerHTML = '<ul class="admin-posts-list"></ul>';
      const postsList = adminPostsContainer.querySelector('.admin-posts-list');
      
      posts.forEach(post => {
        const listItem = document.createElement('li');
        listItem.className = 'admin-post-item';
        listItem.innerHTML = `
          <div class="admin-post-info">
            <span class="admin-post-title">${post.title}</span>
            <span class="admin-post-date">${new Date(post.created_at).toLocaleDateString()}</span>
          </div>
          <div class="admin-post-actions">
            <button class="delete-post-btn" data-post-id="${post.id}"><i class="fas fa-trash"></i> Delete</button>
          </div>
        `;
        postsList.appendChild(listItem);
        
        // Add event listener for delete button
        const deleteBtn = listItem.querySelector('.delete-post-btn');
        deleteBtn.addEventListener('click', function() {
          const postId = this.getAttribute('data-post-id');
          deletePost(postId);
        });
      });
    } else {
      adminPostsContainer.innerHTML = '<div class="no-posts">No posts yet.</div>';
    }
  });
}

// Initialize app
function initApp() {
  checkAuth();
  navigateTo('home');
}

// Start the app
initApp();
