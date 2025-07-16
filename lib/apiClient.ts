
interface ApiResponse<T = any> {
    data?: T;
    error?: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: any;
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean | null>;
}

class ApiClient {
    private baseURL: string;

    constructor(baseURL: string = '/api') {
        this.baseURL = baseURL;
    }

    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
        const {
            method = 'GET',
            body,
            headers = {},
            params
        } = options;

        try {
            // Build URL with query parameters
            let url = `${this.baseURL}${endpoint}`;
            if (params) {
                const searchParams = new URLSearchParams();
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        searchParams.append(key, String(value));
                    }
                });
                const queryString = searchParams.toString();
                if (queryString) {
                    url += `?${queryString}`;
                }
            }
            // Prepare request configuration
            const config: RequestInit = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
            };

            // Add body for non-GET requests
            if (body && method !== 'GET') {
                config.body = JSON.stringify(body);
            }

            // Make the request
            const response = await fetch(url, config);

            // Handle different response statuses
            if (!response.ok) {
                let errorMessage = 'An error occurred';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                return { error: errorMessage };
            }

            // Parse successful response
            const data = await response.json();
            return { data };

        } catch (error) {
            console.error('API request failed:', error);
            return {
                error: error instanceof Error ? error.message : 'Network error occurred'
            };
        }
    }

    // Generic methods
    async get<T>(endpoint: string, params?: Record<string, string | number | boolean | null>): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'GET', params });
    }

    async post<T>(endpoint: string, body: any, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'POST', body, params });
    }

    async put<T>(endpoint: string, body: any, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'PUT', body, params });
    }

    async delete<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'DELETE', params });
    }

    async patch<T>(endpoint: string, body: any, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'PATCH', body, params });
    }

    // User-specific methods
    async getUsers(params: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        sortField?: string;
        sortOrder?: number;
    }) {
        return this.get<{
            users: any[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>('/admin/users', params);
    }

    async getUser(id: string) {
        return this.get(`/admin/users/${id}`);
    }

    async createUser(userData: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        status?: string;
        membershipNumber?: string;
        joinDate?: string;
        paidDate?: string;
        password?: string;
    }) {
        return this.post<any>('/admin/users', userData);
    }

    async updateUser(id: string, userData: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        status?: string;
        membershipNumber?: string;
        joinDate?: string;
        paidDate?: string;
    }) {
        return this.put<any>(`/admin/users/${id}`, userData);
    }

    async deleteUser(id: string) {
        return this.delete(`/admin/users/${id}`);
    }

    // Membership card methods
    async getMembershipCard(userId: string) {
        return this.get('/membership-card', { userId });
    }

    async generateMembershipCard(cardData: {
        userId: string;
        organizationName: string;
        cardNumber: string;
        issueDate: string;
        expiryDate: string;
        design: string;
        additionalInfo?: string;
    }) {
        return this.post('/membership-card', cardData);
    }

    // Auth methods
    async login(credentials: { email: string; password: string }) {
        return this.post('/auth/login', credentials);
    }

    async forgotPassword(email: string) {
        return this.post('/auth/forgot-password', { email });
    }

    async resetPassword(token: string, password: string) {
        return this.post('/auth/reset-password', { token, password });
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string) {
        return this.post('/users/change-password', { userId, currentPassword, newPassword });
    }

    // TrestleBoard methods
    async getTrestleBoards(params?: {
        page?: number;
        limit?: number;
        search?: string;
        category?: string;
        sortField?: string;
        sortOrder?: number;
    }) {
        return this.get<{
            trestleBoards: any[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>('/admin/trestle-board', params);
    }

    async getTrestleBoard(id: string) {
        return this.get<any>(`/admin/trestle-board/${id}`);
    }

    async createTrestleBoard(trestleBoardData: {
        title: string;
        description?: string;
        startDate: string;
        endDate?: string;
        startTime?: string;
        endTime?: string;
        location?: string;
        category: 'REGULAR_MEETING' | 'DISTRICT' | 'EMERGENT' | 'PRACTICE' | 'CGP' | 'SOCIAL';
        isRSVP?: boolean;
        maxAttendees?: number;
    }) {
        return this.post<any>('/admin/trestle-board', trestleBoardData);
    }

    async updateTrestleBoard(id: string, trestleBoardData: {
        title: string;
        description?: string;
        startDate: string;
        endDate?: string;
        startTime?: string;
        endTime?: string;
        location?: string;
        category: 'REGULAR_MEETING' | 'DISTRICT' | 'EMERGENT' | 'PRACTICE' | 'CGP' | 'SOCIAL';
        isRSVP?: boolean;
        maxAttendees?: number;
    }) {
        return this.put<any>(`/admin/trestle-board/${id}`, trestleBoardData);
    }

    async deleteTrestleBoard(id: string) {
        return this.delete(`/admin/trestle-board/${id}`);
    }

    // Document methods
    async getDocuments(params?: {
        page?: number;
        limit?: number;
        search?: string;
        category?: string;
        sortField?: string;
        sortOrder?: number;
    }) {
        return this.get<{
            documents: any[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>('/admin/documents', params);
    }

    async getDocument(id: string) {
        return this.get<any>(`/admin/documents/${id}`);
    }

    async createDocument(documentData: {
        title: string;
        description?: string;
        fileName: string;
        fileUrl: string;
        fileType: string;
        fileSize: number;
        category: string;
        tags?: string[];
        permissions: 'PUBLIC' | 'MEMBER_ONLY' | 'ADMIN_ONLY';
    }) {
        return this.post<any>('/admin/documents', documentData);
    }

    async updateDocument(id: string, documentData: {
        title?: string;
        description?: string;
        category?: string;
        tags?: string[];
        permissions?: 'PUBLIC' | 'MEMBER_ONLY' | 'ADMIN_ONLY';
    }) {
        return this.put<any>(`/admin/documents/${id}`, documentData);
    }

    async deleteDocument(id: string) {
        return this.delete(`/admin/documents/${id}`);
    }

    async uploadDocument(formData: FormData) {
        // For FormData, we need to override the default headers
        const url = `${this.baseURL}/admin/documents`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                // Don't set Content-Type header - let the browser set it for FormData
            });

            if (!response.ok) {
                let errorMessage = 'An error occurred';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                return { error: errorMessage };
            }

            const data = await response.json();
            return { data };
        } catch (error) {
            console.error('Upload request failed:', error);
            return {
                error: error instanceof Error ? error.message : 'Network error occurred'
            };
        }
    }

    async uploadProfileImage(formData: FormData) {
        // For FormData, we need to override the default headers
        const url = `${this.baseURL}/users/profile-image`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                // Don't set Content-Type header - let the browser set it for FormData
            });

            if (!response.ok) {
                let errorMessage = 'An error occurred';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                return { error: errorMessage };
            }

            const data = await response.json();
            return { data };
        } catch (error) {
            console.error('Profile image upload request failed:', error);
            return {
                error: error instanceof Error ? error.message : 'Network error occurred'
            };
        }
    }

    // Notification methods
    async getNotifications(params?: {
        page?: number;
        limit?: number;
        search?: string;
        type?: string;
        status?: string;
        sortField?: string;
        sortOrder?: number;
    }) {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.append('page', params.page.toString());
        if (params?.limit) searchParams.append('limit', params.limit.toString());
        if (params?.search) searchParams.append('search', params.search);
        if (params?.type) searchParams.append('type', params.type);
        if (params?.status) searchParams.append('status', params.status);
        if (params?.sortField) searchParams.append('sortField', params.sortField);
        if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder.toString());
        
        return this.get<{
            notifications: any[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>(`/admin/notifications?${searchParams.toString()}`);
    }

    async markNotificationAsRead(id: string) {
        return this.patch(`/admin/notifications/${id}?action=read`, {});
    }

    async markAllNotificationsAsRead() {
        return this.patch('/admin/notifications/mark-all-read', {});
    }

    async deleteNotification(id: string) {
        return this.delete(`/admin/notifications/${id}`);
    }

    // Support methods
    async getSupportRequests(params?: {
        page?: number;
        limit?: number;
        status?: string;
        priority?: string;
    }) {
        return this.get<{
            supportRequests: any[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>('/admin/support', params);
    }

    async getSupportRequest(id: string) {
        return this.get<any>(`/admin/support/${id}`);
    }

    async createSupportRequest(requestData: {
        userId: string;
        subject: string;
        message: string;
        priority?: string;
    }) {
        return this.post<any>('/admin/support', requestData);
    }

    async updateSupportRequest(id: string, requestData: any) {
        return this.put<any>(`/admin/support/${id}`, requestData);
    }

    async deleteSupportRequest(id: string) {
        return this.delete(`/admin/support/${id}`);
    }

    // Phonebook methods
    async getPhonebookEntries(params?: {
        page?: number;
        limit?: number;
        search?: string;
    }) {
        return this.get<{
            phoneBookEntries: any[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>('/admin/phonebook', params);
    }

    async getPhonebookEntry(id: string) {
        return this.get<any>(`/admin/phonebook/${id}`);
    }

    async createPhonebookEntry(entryData: {
        userId: string;
        email: string;
        phone?: string;
        address?: string;
        isPublic?: boolean;
    }) {
        return this.post<any>('/admin/phonebook', entryData);
    }

    async updatePhonebookEntry(id: string, entryData: {
        email?: string;
        phone?: string;
        address?: string;
        isPublic?: boolean;
    }) {
        return this.put<any>(`/admin/phonebook/${id}`, entryData);
    }

    async deletePhonebookEntry(id: string) {
        return this.delete(`/admin/phonebook/${id}`);
    }

    // Chat methods
    async getChatRooms() {
        return this.get<{
            chatRooms: any[];
        }>('/admin/chat/rooms');
    }

    async getChatMessages(chatRoomId: string, params?: {
        page?: number;
        limit?: number;
    }) {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.append('page', params.page.toString());
        if (params?.limit) searchParams.append('limit', params.limit.toString());
        
        return this.get<{
            messages: any[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>(`/admin/chat/rooms/${chatRoomId}/messages?${searchParams.toString()}`);
    }

    async createChatRoom(data: {
        participantIds: string[];
        name?: string;
    }) {
        return this.post<any>('/admin/chat/rooms', data);
    }

    async sendMessage(data: {
        chatRoomId: string;
        content: string;
        type: 'TEXT' | 'IMAGE' | 'FILE';
    }) {
        return this.post<any>('/admin/chat/messages', data);
    }

    async markMessageAsRead(messageId: string) {
        return this.patch(`/admin/chat/messages/${messageId}/read`, {});
    }

    async markMessagesAsRead(messageIds: string[], chatRoomId: string) {
        return this.patch(`/admin/chat/messages/mark-read`, { messageIds, chatRoomId });
    }

    async deleteMessage(messageId: string) {
        return this.delete(`/admin/chat/messages/${messageId}`);
    }

    // Moderation methods
    async getFlaggedMessages(params?: {
        page?: number;
        limit?: number;
        search?: string;
        isFlagged?: boolean;
        isModerated?: boolean;
        sortField?: string;
        sortOrder?: number;
    }) {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.append('page', params.page.toString());
        if (params?.limit) searchParams.append('limit', params.limit.toString());
        if (params?.search) searchParams.append('search', params.search);
        if (params?.isFlagged !== undefined) searchParams.append('isFlagged', params.isFlagged.toString());
        if (params?.isModerated !== undefined) searchParams.append('isModerated', params.isModerated.toString());
        if (params?.sortField) searchParams.append('sortField', params.sortField);
        if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder.toString());
        
        return this.get<{
            messages: any[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>(`/admin/moderation?${searchParams.toString()}`);
    }

    async moderateMessage(messageId: string, data: {
        isModerated: boolean;
        moderationAction: string;
        flagReason?: string;
    }) {
        return this.put<any>(`/admin/moderation/${messageId}`, data);
    }

    async deleteModeratedMessage(messageId: string) {
        return this.delete(`/admin/moderation/${messageId}`);
    }

    // Announcement methods
    async getAnnouncements(params?: {
        page?: number;
        limit?: number;
        search?: string;
        type?: string;
        status?: string;
        sortField?: string;
        sortOrder?: number;
    }) {
        // Filter out empty strings, null values, and undefined values
        const filteredParams: Record<string, string | number> = {};
        
        if (params?.page) filteredParams.page = params.page;
        if (params?.limit) filteredParams.limit = params.limit;
        if (params?.search && params.search.trim()) filteredParams.search = params.search.trim();
        if (params?.type && params.type.trim()) filteredParams.type = params.type.trim();
        if (params?.status && params.status.trim()) filteredParams.status = params.status.trim();
        if (params?.sortField && params.sortField.trim()) filteredParams.sortField = params.sortField.trim();
        if (params?.sortOrder !== undefined) filteredParams.sortOrder = params.sortOrder;
        return this.get<{
            announcements: any[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>('/admin/announcements', filteredParams);
    }

    async createAnnouncement(data: {
        title: string;
        content: string;
        type: 'GENERAL' | 'IMPORTANT' | 'URGENT' | 'UPDATE';
    }) {
        return this.post<any>('/admin/announcements', data);
    }

    async updateAnnouncement(id: string, data: {
        title?: string;
        content?: string;
        type?: 'GENERAL' | 'IMPORTANT' | 'URGENT' | 'UPDATE';
    }) {
        return this.put<any>(`/admin/announcements/${id}`, data);
    }

    async deleteAnnouncement(id: string) {
        return this.delete(`/admin/announcements/${id}`);
    }

    // Dashboard methods
    async getDashboard() {
        return this.get<{
            stats: {
                totalUsers: number;
                pendingApprovals: number;
                activeTrestleBoards: number;
                supportRequests: number;
                documents: number;
            };
            recentActivity: Array<{
                id: string;
                type: string;
                description: string;
                timestamp: string;
                user: string;
                status?: string;
                startDate?: string;
            }>;
            growthData: {
                labels: string[];
                newMembers: number[];
                trestleBoards: number[];
            };
        }>('/admin/dashboard');
    }

    // Meal Category methods
    async getMealCategories(params?: {
        page?: number;
        limit?: number;
        search?: string;
    }) {
        return this.get<{
            categories: any[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>('/admin/meal/categories', params);
    }

    async getMealCategory(id: string) {
        return this.get(`/admin/meal/categories/${id}`);
    }

    async createMealCategory(categoryData: {
        name: string;
        description?: string;
    }) {
        return this.post<any>('/admin/meal/categories', categoryData);
    }

    async updateMealCategory(id: string, categoryData: {
        name: string;
        description?: string;
    }) {
        return this.put<any>(`/admin/meal/categories/${id}`, categoryData);
    }

    async deleteMealCategory(id: string) {
        return this.delete(`/admin/meal/categories/${id}`);
    }

    // Meal methods
    async getMeals(params?: {
        page?: number;
        limit?: number;
        search?: string;
        categoryId?: string;
    }) {
        return this.get<{
            meals: any[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        }>('/admin/meals', params);
    }

    async getMeal(id: string) {
        return this.get(`/admin/meals/${id}`);
    }

    async createMeal(mealData: {
        title: string;
        description?: string;
        categoryId: string;
    }) {
        return this.post<any>('/admin/meals', mealData);
    }

    async updateMeal(id: string, mealData: {
        title: string;
        description?: string;
        categoryId: string;
    }) {
        return this.put<any>(`/admin/meals/${id}`, mealData);
    }

    async deleteMeal(id: string) {
        return this.delete(`/admin/meals/${id}`);
    }

    // Festive Board methods
    async getFestiveBoards(params?: {
        page?: number;
        limit?: number;
        search?: string;
        year?: number;
    }) {
        return this.get<{
            data: {
                boards: any[];
                pagination: {
                    page: number;
                    limit: number;
                    total: number;
                    totalPages: number;
                };
            };
        }>('/admin/festive-board', params);
    }

    async getFestiveBoard(id: string) {
        return this.get(`/admin/festive-board/${id}`);
    }

    async createFestiveBoard(boardData: {
        month: number;
        year: number;
        title: string;
        description?: string;
        mealIds: string[];
    }) {
        return this.post<any>('/admin/festive-board', boardData);
    }

    async updateFestiveBoard(id: string, boardData: {
        title: string;
        description?: string;
        mealIds: string[];
    }) {
        return this.put<any>(`/admin/festive-board/${id}`, boardData);
    }

    async deleteFestiveBoard(id: string) {
        return this.delete(`/admin/festive-board/${id}`);
    }

    async searchMeals(params?: {
        search?: string;
        categoryId?: string;
        limit?: number;
    }) {
        return this.get<{ data: any[] }>('/admin/festive-board/meals/search', params);
    }

    // User-side Festive Board methods
    async getUserFestiveBoards(params?: {
        year?: number;
        month?: number;
    }) {
        return this.get<{ boards: any[] }>('/festive-board', params);
    }

    async markMealCompleted(data: {
        festiveBoardMealId: string;
        isCompleted: boolean;
    }) {
        return this.post<any>('/festive-board', data);
    }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Export the class for testing or custom instances
export { ApiClient };

// Export types for use in components
export type { ApiResponse, RequestOptions }; 