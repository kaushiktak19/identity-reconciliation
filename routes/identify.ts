import express from 'express'
import pool from '../db/db'

const identifyRoute = express.Router()

identifyRoute.post('/', async (req, res) => {
    const { email, phoneNumber } = req.body
    
    if (!email && !phoneNumber) {
        return res.status(400).json({ error: "Email or Phone-Number is required." })
    }
    
    const client = await pool.connect()
    
    try {
        const { rows: contacts } = await client.query(
            `SELECT * FROM Contact 
             WHERE (email = $1 OR phoneNumber = $2) 
             AND deletedAt IS NULL`,
            [email, phoneNumber]
        )
        
        if (contacts.length === 0) {
            const { rows } = await client.query(
                `INSERT INTO Contact (email, phoneNumber, linkPrecedence, createdAt, updatedAt)
                VALUES ($1, $2, 'primary', NOW(), NOW()) RETURNING *`,
                [email, phoneNumber]
            )
            
            const newContact = rows[0]
            
            return res.status(200).json({
                contact: {
                    primaryContatctId: newContact.id, // Note: keeping the typo as per task spec
                    emails: newContact.email ? [newContact.email] : [],
                    phoneNumbers: newContact.phonenumber ? [newContact.phonenumber] : [],
                    secondaryContactIds: []
                }
            })
        }

        const primaryIds = new Set<number>()
        contacts.forEach(c => {
            if (c.linkprecedence === 'primary') {
                primaryIds.add(c.id)
            } else if (c.linkedid) {
                primaryIds.add(c.linkedid)
            }
        })

        const { rows: allContacts } = await client.query(
            `SELECT * FROM Contact 
             WHERE (id = ANY($1) OR linkedId = ANY($1)) 
             AND deletedAt IS NULL 
             ORDER BY createdAt ASC`,
            [Array.from(primaryIds)]
        )

        const primaryContact = allContacts.find(c => c.linkprecedence === 'primary') || allContacts[0]

        const exists = allContacts.some(c => 
            c.email === email && c.phonenumber === phoneNumber
        )
        
        if (!exists) {
            await client.query(
                `INSERT INTO Contact (email, phoneNumber, linkPrecedence, linkedId, createdAt, updatedAt)
                VALUES ($1, $2, 'secondary', $3, NOW(), NOW())`,
                [email, phoneNumber, primaryContact.id]
            )
        }

        for (const contact of allContacts) {
            if (contact.id !== primaryContact.id && contact.linkprecedence === 'primary') {
                await client.query(
                    `UPDATE Contact 
                     SET linkPrecedence = 'secondary', linkedId = $1, updatedAt = NOW() 
                     WHERE id = $2`,
                    [primaryContact.id, contact.id]
                )
            }
        }

        const { rows: finalContacts } = await client.query(
            `SELECT * FROM Contact 
             WHERE (id = $1 OR linkedId = $1) 
             AND deletedAt IS NULL 
             ORDER BY createdAt ASC`,
            [primaryContact.id]
        )
        
        const emails = [...new Set(finalContacts.map(c => c.email).filter(Boolean))]
        const phoneNumbers = [...new Set(finalContacts.map(c => c.phonenumber).filter(Boolean))]
        const secondaryContactIds = finalContacts
            .filter(c => c.linkprecedence === 'secondary')
            .map(c => c.id)
        

        const primaryEmail = primaryContact.email
        const primaryPhone = primaryContact.phonenumber
        
        if (primaryEmail) {
            emails.unshift(primaryEmail)
            const uniqueEmails = [primaryEmail, ...emails.filter(e => e !== primaryEmail)]
            emails.splice(0, emails.length, ...uniqueEmails)
        }
        
        if (primaryPhone) {
            phoneNumbers.unshift(primaryPhone)
            const uniquePhones = [primaryPhone, ...phoneNumbers.filter(p => p !== primaryPhone)]
            phoneNumbers.splice(0, phoneNumbers.length, ...uniquePhones)
        }
        
        res.status(200).json({
            contact: {
                primaryContatctId: primaryContact.id, // Note: keeping the typo as per task spec
                emails,
                phoneNumbers,
                secondaryContactIds
            }
        })
        
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Internal Server Error' })
    } finally {
        client.release()
    }
})

export default identifyRoute