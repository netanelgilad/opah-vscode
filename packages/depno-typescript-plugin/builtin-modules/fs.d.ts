export const constants: {
	// File Access Constants

	/** Constant for fs.access(). File is visible to the calling process. */
	F_OK: number;

	/** Constant for fs.access(). File can be read by the calling process. */
	R_OK: number;

	/** Constant for fs.access(). File can be written by the calling process. */
	W_OK: number;

	/** Constant for fs.access(). File can be executed by the calling process. */
	X_OK: number;

	// File Copy Constants

	/** Constant for fs.copyFile. Flag indicating the destination file should not be overwritten if it already exists. */
	COPYFILE_EXCL: number;

	/**
	 * Constant for fs.copyFile. copy operation will attempt to create a copy-on-write reflink.
	 * If the underlying platform does not support copy-on-write, then a fallback copy mechanism is used.
	 */
	COPYFILE_FICLONE: number;

	/**
	 * Constant for fs.copyFile. Copy operation will attempt to create a copy-on-write reflink.
	 * If the underlying platform does not support copy-on-write, then the operation will fail with an error.
	 */
	COPYFILE_FICLONE_FORCE: number;

	// File Open Constants

	/** Constant for fs.open(). Flag indicating to open a file for read-only access. */
	O_RDONLY: number;

	/** Constant for fs.open(). Flag indicating to open a file for write-only access. */
	O_WRONLY: number;

	/** Constant for fs.open(). Flag indicating to open a file for read-write access. */
	O_RDWR: number;

	/** Constant for fs.open(). Flag indicating to create the file if it does not already exist. */
	O_CREAT: number;

	/** Constant for fs.open(). Flag indicating that opening a file should fail if the O_CREAT flag is set and the file already exists. */
	O_EXCL: number;

	/**
	 * Constant for fs.open(). Flag indicating that if path identifies a terminal device,
	 * opening the path shall not cause that terminal to become the controlling terminal for the process
	 * (if the process does not already have one).
	 */
	O_NOCTTY: number;

	/** Constant for fs.open(). Flag indicating that if the file exists and is a regular file, and the file is opened successfully for write access, its length shall be truncated to zero. */
	O_TRUNC: number;

	/** Constant for fs.open(). Flag indicating that data will be appended to the end of the file. */
	O_APPEND: number;

	/** Constant for fs.open(). Flag indicating that the open should fail if the path is not a directory. */
	O_DIRECTORY: number;

	/**
	 * constant for fs.open().
	 * Flag indicating reading accesses to the file system will no longer result in
	 * an update to the atime information associated with the file.
	 * This flag is available on Linux operating systems only.
	 */
	O_NOATIME: number;

	/** Constant for fs.open(). Flag indicating that the open should fail if the path is a symbolic link. */
	O_NOFOLLOW: number;

	/** Constant for fs.open(). Flag indicating that the file is opened for synchronous I/O. */
	O_SYNC: number;

	/** Constant for fs.open(). Flag indicating that the file is opened for synchronous I/O with write operations waiting for data integrity. */
	O_DSYNC: number;

	/** Constant for fs.open(). Flag indicating to open the symbolic link itself rather than the resource it is pointing to. */
	O_SYMLINK: number;

	/** Constant for fs.open(). When set, an attempt will be made to minimize caching effects of file I/O. */
	O_DIRECT: number;

	/** Constant for fs.open(). Flag indicating to open the file in nonblocking mode when possible. */
	O_NONBLOCK: number;

	// File Type Constants

	/** Constant for fs.Stats mode property for determining a file's type. Bit mask used to extract the file type code. */
	S_IFMT: number;

	/** Constant for fs.Stats mode property for determining a file's type. File type constant for a regular file. */
	S_IFREG: number;

	/** Constant for fs.Stats mode property for determining a file's type. File type constant for a directory. */
	S_IFDIR: number;

	/** Constant for fs.Stats mode property for determining a file's type. File type constant for a character-oriented device file. */
	S_IFCHR: number;

	/** Constant for fs.Stats mode property for determining a file's type. File type constant for a block-oriented device file. */
	S_IFBLK: number;

	/** Constant for fs.Stats mode property for determining a file's type. File type constant for a FIFO/pipe. */
	S_IFIFO: number;

	/** Constant for fs.Stats mode property for determining a file's type. File type constant for a symbolic link. */
	S_IFLNK: number;

	/** Constant for fs.Stats mode property for determining a file's type. File type constant for a socket. */
	S_IFSOCK: number;

	// File Mode Constants

	/** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating readable, writable and executable by owner. */
	S_IRWXU: number;

	/** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating readable by owner. */
	S_IRUSR: number;

	/** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating writable by owner. */
	S_IWUSR: number;

	/** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating executable by owner. */
	S_IXUSR: number;

	/** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating readable, writable and executable by group. */
	S_IRWXG: number;

	/** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating readable by group. */
	S_IRGRP: number;

	/** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating writable by group. */
	S_IWGRP: number;

	/** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating executable by group. */
	S_IXGRP: number;

	/** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating readable, writable and executable by others. */
	S_IRWXO: number;

	/** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating readable by others. */
	S_IROTH: number;

	/** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating writable by others. */
	S_IWOTH: number;

	/** Constant for fs.Stats mode property for determining access permissions for a file. File mode indicating executable by others. */
	S_IXOTH: number;

	/**
	 * When set, a memory file mapping is used to access the file. This flag
	 * is available on Windows operating systems only. On other operating systems,
	 * this flag is ignored.
	 */
	UV_FS_O_FILEMAP: number;
}
